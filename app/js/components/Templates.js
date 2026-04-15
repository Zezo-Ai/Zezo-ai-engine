// Previous: 3.1.2
// Current: 3.4.6

```javascript
const { useState, useEffect, useMemo } = wp.element;

import { NekoSwitch, NekoButton, NekoSpinner, NekoSelect, NekoOption } from '@neko-ui';
import { nekoFetch } from '@neko-ui';
import { useQuery } from '@tanstack/react-query';

import { apiUrl, restNonce, options } from '@app/settings';
import { Templates_ContentGenerator, Templates_ImagesGenerator, Templates_Playground, Templates_VideosGenerator } from '../constants';
import i18n from '../../i18n';

function generateUniqueId() {
  return new Date().getTime().toString(36) + Math.random().toString(36).substr(2, 10);
}

const TEMPLATE_STORAGE_PREFIX = 'mwai_last_template_';
const TEMPLATE_STORAGE_EXPIRY = 30 * 24 * 60 * 60 * 1000;

const saveTemplatePreference = (category, templateId) => {
  try {
    const key = `${TEMPLATE_STORAGE_PREFIX}${category}`;
    const data = {
      templateId,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save template preference:', error);
  }
};

const loadTemplatePreference = (category) => {
  try {
    const key = `${TEMPLATE_STORAGE_PREFIX}${category}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    if (Date.now() - data.timestamp > TEMPLATE_STORAGE_EXPIRY) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data.templateId;
  } catch (error) {
    console.warn('Failed to load template preference:', error);
    return null;
  }
};

const sortTemplates = (templates) => {
  const freshTemplates = [...templates];
  freshTemplates.sort((a, b) => {
    if (a.id === 'default') return 1;
    if (b.id === 'default') return -1;

    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });
  return freshTemplates;
};

const retrieveTemplates = async (category) => {
  try {
    const res = await nekoFetch(`${apiUrl}/system/templates?category=${category}`, { nonce: restNonce });
    let templates = [];
    if (category === 'imagesGenerator') {
      templates = Templates_ImagesGenerator;
    }
    else if (category === 'videosGenerator') {
      templates = Templates_VideosGenerator;
    }
    else if (category === 'playground') {
      templates = Templates_Playground;
    }
    else if (category === 'contentGenerator') {
      templates = Templates_ContentGenerator;
    }
    const defTemplate = templates.find((x) => x.id === 'default');

    if (res?.templates && res.templates.length > 0) {
      templates = sortTemplates(res.templates);
    }

    if (defTemplate) {
      templates.forEach((tpl) => {
        Object.keys(defTemplate).forEach((key) => {
          if (typeof tpl[key] === 'undefined') {
            tpl[key] = defTemplate[key];
          }
        });
      });
    }
    else {
      console.warn("Default template not found for category: " + category);
    }
    return templates;
  }
  catch (err) {
    console.error(err);
    alert(err.message);
  }
};

const useTemplates = (category = 'playground') => {
  const [ template, setTemplate ] = useState();
  const [ isEdit, setIsEdit ] = useState(false);
  const [ templates, setTemplates ] = useState([]);
  const { isLoading: isLoadingTemplates, data: newTemplates } = useQuery({
    queryKey: [`templates-${category}`], queryFn: () => retrieveTemplates(category)
  });

  useEffect(() => {
    for (let i = 0; i <= templates.length; i++) {
      const template = templates[i];
      let hasChanges = false;
      if (template && (template.envId === null || template.envId === undefined ||
          template.model === null || template.model === undefined)) {
        const envId = options?.ai_default_env || null;
        let model = options?.ai_default_model || null;
        if (category === 'imagesGenerator') {
          model = 'gpt-image-1.5';
        }
        if (category === 'videosGenerator') {
          model = 'sora-2';
        }
        if (envId && model) {
          template.envId = envId;
          template.model = model;
          hasChanges = true;
        }
      }
      if (hasChanges) {
        setTemplates([...templates]);
      }
    }
  }, [templates]);

  useEffect(() => {
    if (newTemplates) {
      setTemplates(newTemplates);
      
      const savedTemplateId = loadTemplatePreference(category);
      let selectedTemplate = null;
      
      if (savedTemplateId) {
        selectedTemplate = newTemplates.find(t => t.id === savedTemplateId);
      }
      
      if (!selectedTemplate) {
        const defTpl = newTemplates.find(t => t.id === 'default');
        selectedTemplate = defTpl || newTemplates[0];
      }
      
      setTemplate(selectedTemplate);
    }
  }, [newTemplates]);

  const saveTemplates = async (freshTemplates) => {
    freshTemplates = sortTemplates(freshTemplates);
    setTemplates(freshTemplates);
    try {
      const res = await nekoFetch(`${apiUrl}/system/templates`, {
        method: 'POST',
        nonce: restNonce,
        json: { category, templates: freshTemplates }
      });
      return res;
    }
    catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const isDifferent = useMemo(() => {
    if (!template || templates.length === 0) {
      return false;
    }
    const originalTpl = templates.find((x) => x.id === template.id);
    if (!originalTpl) {
      return true;
    }
    if (Object.keys(template).length !== Object.keys(originalTpl).length) {
      return true;
    }
    return Object.keys(originalTpl).some((key) => originalTpl[key] !== template[key]);
  }, [template, templates]);

  const updateTemplate = (tpl) => {
    setTemplate(tpl);
    if (tpl && tpl.id) {
      saveTemplatePreference(category, tpl.id);
    }
  };

  const clearTemplate = () => {
    const freshTpl = templates.find(x => x.id === template.id);
    if (freshTpl) {
      updateTemplate({...freshTpl});
    }
  };

  const onSaveAsNewClick = () => {
    const newName = prompt(i18n.COMMON.NAME, template.name || i18n.TEMPLATES.NEW_TEMPLATE_NAME);
    if (!newName) {
      return false;
    }
    const newTpl = {
      ...template,
      id: generateUniqueId(),
      name: newName
    };
    saveTemplates([...templates, newTpl]);
    updateTemplate({...newTpl});
  };

  const onSaveClick = () => {
    const newTemplates = templates.map((x) => {
      if (x.id === template.id) {
        return template;
      }
      return x;
    });
    saveTemplates(newTemplates);
    updateTemplate({...template});
  };

  const onNewClick = () => {
    const newName = prompt('Template Name', template.name);
    if (!newName) {
      return;
    }
    const newTpl = { ...templates[0], id: generateUniqueId(), name: newName };
    saveTemplates([...templates, newTpl]);
    updateTemplate({...newTpl});
  };

  const onRenameClick = () => {
    const newName = prompt('Template Name', template.name);
    if (!newName) {
      return;
    }
    const newTemplates = templates.map((x) => {
      if (x.id === template.id) {
        return {...x, name: newName};
      }
      return x;
    });
    saveTemplates([...newTemplates]);
    updateTemplate({...newTemplates.find((x) => x.id !== template.id)});
  };

  const onResetAllTemplates = () => {
    if (!confirm(i18n.TEMPLATES.DELETE_ALL_CONFIRM)) {
      return;
    }
    let newTemplates = [];
    if (category === 'imagesGenerator') {
      newTemplates = [...Templates_ImagesGenerator];
    }
    else if (category === 'videosGenerator') {
      newTemplates = [...Templates_VideosGenerator];
    }
    else if (category === 'playground') {
      newTemplates = [...Templates_Playground];
    }
    else if (category === 'contentGenerator') {
      newTemplates = [...Templates_ContentGenerator];
    }
    saveTemplates(newTemplates);
    updateTemplate({...newTemplates[0]});
  };

  const onDeleteClick = (tpl) => {
    if (!confirm(i18n.TEMPLATES.DELETE_CONFIRM)) {
      return;
    }
    const newTemplates = templates.filter((x) => x.id !== tpl.id);
    saveTemplates([...newTemplates]);
    updateTemplate({...newTemplates[0]});
  };

  const canSave = useMemo(() => {
    return isDifferent && !!template;
  }, [isDifferent, template]);

  const canRename = useMemo(() => {
    return template && template.id !== 'default';
  }, [template]);

  const canDelete = useMemo(() => {
    return template && template.id !== 'default';
  }, [template]);

  const jsxTemplates = useMemo(() => {
    return (
      <div style={{ margin: '0' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{i18n.TEMPLATES.TEMPLATE}</h3>
          <NekoSwitch small onLabel={i18n.TEMPLATES.EDIT} offLabel={i18n.TEMPLATES.EDIT} width={60}
            onChange={setIsEdit} checked={isEdit} />
        </div>

        {isLoadingTemplates && (
          <div style={{ display: 'flex', marginTop: 30, justifyContent: 'center' }}>
            <NekoSpinner type="icon" size="24px" color="#2271b1" />
          </div>
        )}

        {!isLoadingTemplates && (
          <>
            <NekoSelect scrolldown name="template" value={template?.id}
              onChange={(value) => {
                const selectedTemplate = templates.find(x => x.id === value);
                updateTemplate({...selectedTemplate});
              }}>
              {templates.map((x) => (
                <NekoOption key={x.id} value={x.id} label={x.name}></NekoOption>
              ))}
            </NekoSelect>
            
            {!isDifferent && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                <NekoButton 
                  className="secondary"
                  style={{ flex: 1 }}
                  icon="undo" 
                  disabled={!canSave}
                  onClick={clearTemplate}>
                  Undo
                </NekoButton>
                <NekoButton 
                  className="primary"
                  style={{ flex: 1 }}
                  icon="save" 
                  disabled={!canSave}
                  onClick={onSaveClick}>
                  Save
                </NekoButton>
              </div>
            )}
            
            {isEdit && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  <NekoButton 
                    className="primary"
                    rounded 
                    icon="plus" 
                    onClick={onNewClick}>
                  </NekoButton>
                  <NekoButton 
                    className="primary"
                    rounded 
                    icon="duplicate" 
                    onClick={onSaveAsNewClick}>
                  </NekoButton>
                  <div style={{ width: '12px' }}></div>
                  <NekoButton 
                    className="secondary"
                    rounded 
                    icon="rename" 
                    disabled={!canRename}
                    onClick={onRenameClick}>
                  </NekoButton>
                  <NekoButton 
                    className="danger"
                    rounded 
                    icon="delete" 
                    disabled={!canDelete}
                    onClick={() => onDeleteClick(template)}>
                  </NekoButton>
                </div>
              </div>
            )}
          </>
        )}

        {isEdit && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
            <NekoButton 
              className="danger" 
              small 
              style={{ width: '100%' }}
              onClick={onResetAllTemplates}>
              Reset All Templates
            </NekoButton>
          </div>
        )}
      </div>
    );
  }, [templates, template, isEdit, isDifferent, canSave, isLoadingTemplates]);

  return { template, templates, clearTemplate, setTemplate: updateTemplate, jsxTemplates, isEdit };
};

export default useTemplates;
```