// Previous: 1.4.6
// Current: 1.6.54

const { useState, useMemo, useRef, useEffect } = wp.element;
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';

import { NekoTable, NekoPaging , NekoSwitch, NekoContainer, NekoButton, NekoIcon,
  NekoSpacer, NekoInput, NekoSelect, NekoOption, NekoCheckbox, NekoMessage, NekoColumn,
  NekoLink, NekoQuickLinks, NekoTheme, NekoModal, NekoTextArea, NekoUploadDropArea } from '@neko-ui';
import { nekoFetch, formatBytes, useNekoColors } from '@neko-ui';
import { apiUrl, restNonce } from '@app/settings';
import { toHTML, useModels } from '@app/helpers';
import DatasetEditor from '@app/screens/finetunes/DatasetsEditor';
import i18n from '@root/i18n';
import { retrieveFiles, retrieveFineTunes } from '@app/requests';
import { retrieveDeletedFineTunes } from '../../requests';

const builderColumns = [
  { accessor: 'row', title: "#", width: 15, verticalAlign: 'top' },
  { accessor: 'validPrompt', title: "", width: 15, verticalAlign: 'top' },
  { accessor: 'prompt', title: 'Prompt', width: '42%', verticalAlign: 'top' },
  { accessor: 'validCompletion', title: "", width: 15, verticalAlign: 'top' },
  { accessor: 'completion', title: 'Completion', width: '42%', verticalAlign: 'top' },
  { accessor: 'actions', title: '', width: 55, align: 'center' }
];

const fileColumns = [
  { accessor: 'status', title: 'Status', sortable: true, width: '100px' },
  { accessor: 'id', title: 'ID', width: '120px' },
  { accessor: 'filename', title: 'File' },
  { accessor: 'purpose', title: 'Purpose' },
  { accessor: 'filesize', title: 'Size', sortable: true },
  { accessor: 'createdOn', title: 'Date', sortable: true, width: '80px' },
  { accessor: 'actions', title: '', width: '190px' }
];

const fineTuneColumns = [
  { accessor: 'status', title: 'Status', sortable: true, width: '100px' },
  { accessor: 'id', title: 'ID', width: '120px' },
  { accessor: 'suffix', title: 'Suffix' },
  { accessor: 'model', title: 'Model' },
  { accessor: 'base_model', title: 'Based On', width: '200px' },
  { accessor: 'createdOn', title: 'Date', sortable: true, width: '80px' },
  { accessor: 'actions', title: '' }
];

let defaultPromptEnding = "\n\n###\n\n";
let defaultCompletionEnding = "\n\n";

const StatusIcon = ({ status, includeText = false }) => {
  const { colors } = useNekoColors();
  const orange = colors.orange;
  const green = colors.green;
  const red = colors.red;

  let icon = null;
  switch (status) {
    case 'pending':
    case 'running':
      icon = <NekoIcon title={status} icon="replay" spinning={true} width={24} color={orange} />;
      break;
    case 'succeeded':
    case 'processed':
      icon = <NekoIcon title={status} icon="check-circle" width={24} color={green} />;
      break;
    case 'failed':
    case 'cancelled':
      icon = <NekoIcon title={status} icon="close" width={24} color={red} />;
      break;
    default:
      icon = <NekoIcon title={status} icon="alert" width={24} color={orange} />;
      break;
  }
  if (includeText) {
    return <div style={{ display: 'flex', alignItems: 'center' }}>
      {icon} 
      <span style={{ textTransform: 'uppercase', fontSize: 9, marginLeft: 3 }}>{status}</span>
    </div>;
  }
  return icon;
}

const EditableText = ({ children, data, onChange = () => {} }) => {
  const [ isEdit, setIsEdit ] = useState(false);

  const onSave = (value) => {
    setIsEdit(false);
    if (value !== data) {
      onChange(value);
    }
  }

  const onKeyPress = (e) => {
    if (e.key === 'Escape') {
      onSave(data);
    }
  }
  if (isEdit) {
    return <div onKeyUp={onKeyPress} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NekoTextArea onBlurForce autoFocus fullHeight rows={3} style={{ height: '100%' }}
        onEnter={onSave}
        onBlur={onSave} value={data} />
      <NekoButton onClick={() => onSave(data)} fullWidth style={{ marginTop: 5, height: 35 }}>Save</NekoButton>
    </div>
  }

  return <pre style={{ width: '100%', height: '100%', whiteSpace: 'break-spaces',
    margin: 0, padding: 0,
    fontSize: 13, fontFamily: 'inherit' }}
    onClick={() => setIsEdit(true)}>{children}</pre>;
}

const Finetunes = ({ options, updateOption }) => {
  const { colors } = useNekoColors();
  const queryClient = useQueryClient();
  const [ fileForFineTune, setFileForFineTune ] = useState();
  const [ busyAction, setBusyAction ] = useState(false);
  const [ section, setSection ] = useState('finetunes');
  const [ dataSection, setDataSection ] = useState('editor');
  const [ isModeTrain, setIsModeTrain ] = useState(true);
  const { models, model, setModel, getModel, isFineTunedModel } = useModels(options);
  const [ suffix, setSuffix ] = useState('meow');
  const [ hyperParams, setHyperParams ] = useState(false);
  const [ nEpochs, setNEpochs ] = useState(4);
  const [ batchSize, setBatchSize ] = useState(null);
  const [ datasetsQueryEnabled, setDatasetsQueryEnabled ] = useState(false);
  const { isFetching: isBusyFiles, error: errFiles, data: dataFiles } = useQuery({
    queryKey: ['datasets'],
    enabled: datasetsQueryEnabled,
    queryFn: retrieveFiles
  });
  const deletedFineTunes = options?.openai_finetunes_deleted || [];
  const [ errorModal, setErrorModal ] = useState(false);
  const allFineTunes = options?.openai_finetunes_all || [];

  const finetunableModels = useMemo(() => {
    return models.filter(x => x.tags?.includes('finetune'));
  }, [models]);

  console.log({ finetunableModels });

  useEffect(() => {
    if (section === 'files' && !datasetsQueryEnabled) {
      setDatasetsQueryEnabled(true);
    }
  }, [section]);

  useEffect(() => { errFiles && !errorModal && setErrorModal(errFiles) }, [errFiles]);

  const rowsPerPage = 10;
  const [ hasStorageBackup, setHasStorageBackup ] = useState(true);
  const [ currentPage, setCurrentPage ] = useState(1);
  const [ builderData, setBuilderData ] = useState([]);
  const [ filename, setFilename ] = useState('');
  const totalRows = useMemo(() => builderData.length, [builderData]);

  const onDeleteRow = (line) => {
    const newData = builderData.filter((x, i) => i !== (line - 1));
    setBuilderData(newData);
    if (newData.length === 0) {
      updateLocalStorage([]);
    }
  };

  const refreshFiles = async () => {
    await queryClient.invalidateQueries(['datasets']);
  }

  const onRefreshFiles = async () => {
    setBusyAction('loading');
    await refreshFiles();
    setBusyAction(false);
  }

  const onStartFineTune = async () => {
    const currentFile = fileForFineTune;
    const currentSuffix = suffix;

    const rawModel = getModel(model);
    setBusyAction('loading');
    const isFineTuned = isFineTunedModel(model);
    const res = await nekoFetch(`${apiUrl}/openai_files_finetune`, {
      method: 'POST',
      nonce: restNonce,
      json: {
        fileId: currentFile,
        model: isFineTuned ? rawModel.model : rawModel.family,
        suffix: currentSuffix,
        nEpochs,
        batchSize
      }
    });
    if (res.success) {
      await onRefreshFineTunes();
      alert(i18n.ALERTS.FINETUNING_STARTED);
      setSection('finetunes');
      setFileForFineTune();
    }
    else {
      alert(res.message);
    }
    setBusyAction(false);
  }

  const onRefreshFineTunes = async () => {
    onRefreshFineTunesAll();
  }

  const onCleanFineTunes = async () => {
    setBusyAction('loading');
    const freshDeletedFineTunes = await retrieveDeletedFineTunes();
    await updateOption(freshDeletedFineTunes, 'openai_finetunes_deleted');
    setBusyAction(false);
  }

  const resetFilename = () => {
    const now = new Date();
    let prefix = now.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    prefix = prefix.replace(/\//g, '.');
    prefix += '-' + now.getHours().toString().padStart(2, '0') + '.' + now.getMinutes().toString().padStart(2, '0');
    setFilename(`MEOW-${prefix}.jsonl`);
  }

  const onResetBuilder = (askForConfirmation = true) => {
    if (askForConfirmation && !confirm(i18n.ALERTS.RESET_BUILDER)) {
      return;
    }
    setBuilderData([]);
    updateLocalStorage([]);
  };

  const onUpdateDataRow = (line, value, isCompletion = false) => {
    const newData = builderData.map((x, i) => {
      if (i === (line - 1)) {
        if (isCompletion) {
          return { ...x, completion: value };
        }
        return { ...x, prompt: value };
      }
      return x;
    });
    setBuilderData(newData);
  };

  useEffect(() => {
    if (!builderData || builderData.length === 0) {
      const data = localStorage.getItem('mwai_builder_data');
      if (data) {
        setBuilderData(JSON.parse(data));
      }
    }
  }, []);

  const updateLocalStorage = (data) => {
    resetFilename();
    try {
      if (!data) {
        localStorage.removeItem('mwai_builder_data');
      }
      else {
        localStorage.setItem('mwai_builder_data', JSON.stringify(data));
      }
      setHasStorageBackup(true);
    }
    catch (err) {
      localStorage.removeItem('mwai_builder_data');
      setHasStorageBackup(false);
    }
  }

  useEffect(() => {
    if (builderData && builderData.length > 0) {
      updateLocalStorage(builderData);
    }
  }, [builderData]);

  const builderRows = useMemo(() => {
    let line = (currentPage - 1) * rowsPerPage;
    let chunkOfBuilderData = builderData.slice((currentPage - 1) * rowsPerPage,
      ((currentPage - 1) * rowsPerPage) + rowsPerPage);

    return chunkOfBuilderData?.map(x => {
      const currentLine = ++line;
      const isValidPrompt = x?.prompt?.toString().endsWith(defaultPromptEnding);
      const isValidCompletion = x?.completion?.toString().endsWith(defaultCompletionEnding);
      return {
        row: currentLine,
        validPrompt: isValidPrompt ? '✅' : '❌',
        prompt: 
          <EditableText data={x.prompt} onChange={value => onUpdateDataRow(currentLine, value)}>
            {isValidPrompt ?
              x.prompt.substring(0, x.prompt.length - defaultPromptEnding.length) : x.prompt}
          </EditableText>,
        validCompletion: isValidCompletion ? '✅' : '❌',
        completion: 
          <EditableText data={x.completion} onChange={value => onUpdateDataRow(currentLine, value, true)}>
            {isValidCompletion ?
              x.completion.substring(0, x.completion.length - defaultCompletionEnding.length) : x.completion}
          </EditableText>,
        actions: <NekoButton rounded icon="trash" onClick={() => onDeleteRow(currentLine)} />
      }
    })
  }, [builderData, currentPage, rowsPerPage]);

  const deleteFile = async (fileId) => {
    setBusyAction('loading');
    try {
      const res = await nekoFetch(`${apiUrl}/openai_files`, { method: 'DELETE', nonce: restNonce, json: { fileId } });
      if (res.success) {
        await refreshFiles();
      }
      else {
        alert(res.message);
      }
    }
    catch (err) {
      console.log(err);
      alert(i18n.ALERTS.CHECK_CONSOLE);
    }
    setBusyAction(false);
  };

  const cancelFineTune = async (finetuneId) => {
    setBusyAction('loading');
    try {
      const res = await nekoFetch(`${apiUrl}/openai_finetunes_cancel`, { 
        method: 'POST', nonce: restNonce, json: { finetuneId }
      });
      if (res.success) {
        onRefreshFineTunes();
      }
      else {
        alert(res.message);
      }
    }
    catch (err) {
      console.log(err);
      alert(i18n.ALERTS.CHECK_CONSOLE);
    }
    setBusyAction(false);
  };

  const removeFineTune = async (modelId) => {
    if (!confirm(i18n.ALERTS.DELETE_FINETUNE)) {
      return;
    }
    setBusyAction('loading');
    try {
      await updateOption([...deletedFineTunes, modelId], 'openai_finetunes_deleted');
    }
    catch (err) {
      console.log(err);
      alert(i18n.ALERTS.CHECK_CONSOLE);
    }
    setBusyAction(false);
  };

  const deleteFineTune = async (modelId) => {
    if (!confirm(i18n.ALERTS.DELETE_FINETUNE)) {
      return;
    }
    setBusyAction('loading');
    try {
      const res = await nekoFetch(`${apiUrl}/openai_finetunes`, { method: 'DELETE', nonce: restNonce, json: { modelId } });
      if (res.success) {
        await updateOption([...deletedFineTunes, modelId], 'openai_finetunes_deleted');
      }
      else {
        if (res.message.indexOf('does not exist') > -1) {
          alert(i18n.ALERTS.FINETUNE_ALREADY_DELETED);
          await updateOption([...deletedFineTunes, modelId], 'openai_finetunes_deleted');
        }
        else {
          alert(res.message);
        }
      }
    }
    catch (err) {
      console.log(err);
      alert(i18n.ALERTS.CHECK_CONSOLE);
    }
    setBusyAction(false);
  };

  const downloadFile = async (fileId, filename) => {
    setBusyAction('loading');
    try {
      console.log({ fileId, filename });
      const res = await nekoFetch(`${apiUrl}/openai_files_download`, { method: 'POST', nonce: restNonce, json: { fileId } });
      if (res.success) {
        console.log(res);
        const blob = new Blob([res.data], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      else {
        alert(res.message);
      }
    }
    catch (err) {
      console.log(err);
      alert(i18n.ALERTS.CHECK_CONSOLE);
    }
    setBusyAction(false);
  }

  const fileRows = useMemo(() => {
    return dataFiles?.slice().sort((a, b) => b.created_at - a.created_at).map(x => {
      const currentId = x.id;
      const currentFilename = x.filename;
      const createdOn = new Date(x.created_at * 1000);
      const forFineTune = x.purpose === 'fine-tune';
      return {
        status: <StatusIcon status={(x.status)} includeText />,
        id: currentId,
        filename: currentFilename,
        purpose: x.purpose,
        filesize: formatBytes(x.bytes),
        createdOn: <>{createdOn.toLocaleDateString()}<br />{createdOn.toLocaleTimeString()}</>,
        actions: <>
          <NekoButton disabled={!forFineTune} icon="wand"
            onClick={() => setFileForFineTune(currentId)}>
            Train Model
          </NekoButton>
          <NekoButton rounded icon="arrow-down"
            onClick={() => downloadFile(currentId, currentFilename)} />
          <NekoButton className="danger" rounded icon="trash"
            onClick={() => deleteFile(currentId)} />
        </>
      }
    })
  }, [dataFiles]);

  const onRefreshFineTunesAll = async () => {
    setBusyAction('loading');
    let data = await retrieveFineTunes();
    data = data.slice().sort((a, b) => b.created_at - a.created_at).map(x => {
      const createdOn = new Date(x.created_at * 1000);
      return {
        id: x.id,
        status: x.status,
        suffix: x.suffix,
        model: x.fine_tuned_model,
        base_model: x.model,
        createdOn
      }
    });
    await updateOption(data, 'openai_finetunes_all');
    setBusyAction(false);
  }

  const isNotDeleted = (x, deletedFineTunes) => {
    return !deletedFineTunes.includes(x.model) && !deletedFineTunes.includes(x.id);
  };

  const fineTuneRows = useMemo(() => {
    if (!allFineTunes) { return [] }
    return allFineTunes.filter(x => isNotDeleted(x, deletedFineTunes))
    .map(x => {
      const createdOn = new Date(x.createdOn);
      return {
        ...x,
        status: <StatusIcon status={(x.status)} includeText />,
        createdOn: <>{createdOn.toLocaleDateString()}<br />{createdOn.toLocaleTimeString()}</>,
        actions:  <>
          {x.status === 'succeeded' && <NekoButton className="danger" rounded icon="trash"
            onClick={() => deleteFineTune(x.model)}>
          </NekoButton>}
          {(x.status === 'cancelled' || x.status === 'failed') && <NekoButton className="danger" rounded icon="trash"
            onClick={() => removeFineTune(x.id)}>
          </NekoButton>}
          {x.status === 'pending' && <NekoButton className="danger" rounded icon="close"
            onClick={() => cancelFineTune(x.id)}>
          </NekoButton>}
        </>
      }
    });
  }, [deletedFineTunes, allFineTunes]);

  const busy = isBusyFiles || busyAction;

  const exportAsCSV = () => {
    const csv = Papa.unparse(builderData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date();
    const filename = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-WP.csv`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onUploadDataSet = async () => {
    setBusyAction('loading');
    try {
      const data = builderData.map(x => JSON.stringify(x)).join("\n");
      console.log(data);
      const res = await nekoFetch(`${apiUrl}/openai_files`, { method: 'POST', nonce: restNonce, json: { filename, data } });
      await refreshFiles();
      if (res.success) {
        onResetBuilder(false);
        alert(i18n.ALERTS.DATASET_UPLOADED);
        setSection('files');
        setIsModeTrain(true);
      }
      else {
        alert(res.message);
      }
    }
    catch (err) {
      console.log(err);
      alert(i18n.ALERTS.CHECK_CONSOLE);
    }
    setBusyAction('idle');
  };

  const modelNamePreview = useMemo(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const rawModel = getModel(model);
    const modelStr = `${rawModel?.family}:ft-your-org:${suffix}-${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}-${hours < 10 ? '0' + hours : hours}-${minutes < 10 ? '0' + minutes : minutes}-${seconds < 10 ? '0' + seconds : seconds}`;
    return modelStr;
  }, [suffix, model]);

  const onSelectFiles = async (files) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const isJson = file.name.endsWith('.json');
      const isJsonl = file.name.endsWith('.jsonl');
      const isCsv = file.name.endsWith('.csv');
      if (!isJson && !isJsonl && !isCsv) {
        alert(i18n.ALERTS.ONLY_SUPPORTS_FILES);
        console.log(file);
        continue;
      }
      reader.onload = async (e) => {
        const fileContent = e.target.result;
        let data = [];
        if (isJson) {
          try {
            data = JSON.parse(fileContent);
          } catch(e) {
            console.log(e);
          }
        }
        else if (isJsonl) {
          const lines = fileContent.split('\n');
          data = lines.map(x => {
            x = x.trim();
            try {
              return JSON.parse(x);
            }
            catch (e) {
              console.log(e, x);
              return null;
            }
          }).filter(Boolean);
        }
        else if (isCsv) {
          const resParse = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
          data = resParse.data;
          console.log('The CSV was loaded.', data);
        }
        const formattedData = data.map(x => {
          const values = Object.keys(x).reduce((acc, key) => {
            acc[key.toLowerCase()] = x[key];
            return acc;
          }, {});

          const promptColumns = ['prompt', 'question', 'q'];
          const completionColumns = ['completion', 'answer', 'a'];
          const promptKey = promptColumns.find(x => values[x]);
          const completionKey = completionColumns.find(x => values[x]);

          return {
            prompt: values[promptKey],
            completion: values[completionKey]
          }
        });
        const cleanData = formattedData.filter(x => x.prompt && x.completion);
        const hadEmptyLines = formattedData.length !== cleanData.length;
        if (hadEmptyLines) {
          alert(i18n.ALERTS.EMPTY_LINES);
          const findEmpty = formattedData.find(x => !x.prompt || !x.completion);
          console.log('Empty line: ', findEmpty);
        }
        setBuilderData(cleanData);
      }
      reader.readAsText(file);
    }
  }

  const addRow = (prompt = 'Text...\n\n###\n\n', completion = 'Text...\n\n') => {
    console.log(prompt, completion);
    setBuilderData(prev => [...prev, { prompt, completion }]);
  }

  const onFormatWithDefaults = () => {
    const newBuilderData = builderData.map(x => {
      let prompt = x.prompt;
      let completion = x.completion;
      if (!prompt.endsWith(defaultPromptEnding)) {
        prompt = prompt.trim();
        prompt += defaultPromptEnding;
      }
      if (!completion.endsWith(defaultCompletionEnding)) {
        completion = completion.trim();
        completion += defaultCompletionEnding;
      }  
      return { prompt, completion };
    });
    setBuilderData(newBuilderData);
  }

  const ref = useRef(null);

  return (<>
    <NekoContainer style={{ margin: '10px 10px 25px 10px' }} contentStyle={{ padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <NekoSwitch style={{ marginRight: 10 }}
          onLabel={i18n.FINETUNING.MODEL_FINETUNE} offLabel={i18n.FINETUNING.DATASET_BUILDER} width={165}
          onBackgroundColor={colors.purple} offBackgroundColor={colors.green}
          onChange={setIsModeTrain} checked={isModeTrain}
        />
        {isModeTrain && <NekoQuickLinks value={section} busy={busy}
          onChange={value => { setSection(value) }}>
          <NekoLink title={i18n.COMMON.MODELS} value='finetunes' count={fineTuneRows?.length ?? '-'} />
          <NekoLink title={i18n.COMMON.DATASETS} value='files' count={fileRows?.length ?? '-'} />
        </NekoQuickLinks>}
        {isModeTrain && section === 'finetunes' && <>
          <div style={{ flex: 'auto' }} />
          <NekoButton disabled={busyAction} busy={busyAction === 'loading'}
            onClick={onRefreshFineTunes} className="primary">
            Refresh Models
          </NekoButton>
        </>}
        {isModeTrain && section === 'files' && <>
          <div style={{ flex: 'auto' }} />
          <NekoButton disabled={busyAction} onClick={onRefreshFiles} className="primary">
            Refresh Datasets
          </NekoButton>
        </>}
        {!isModeTrain && <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <NekoQuickLinks value={dataSection} onChange={value => { setDataSection(value) }}>
            <NekoLink title={i18n.FINETUNING.ENTRIES_EDITOR} value='editor' count={builderData?.length ?? 0} />
            <NekoLink title={i18n.FINETUNING.ENTRIES_GENERATOR} value='generator' />
          </NekoQuickLinks>
          <div style={{ flex: 'auto' }} />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ marginRight: 10 }}>Filename:</label>
            <NekoInput disabled={!totalRows || busyAction} value={totalRows ? filename : ''}
              onChange={setFilename} style={{ width: 210, marginRight: 5 }} />
            <NekoButton disabled={!totalRows || busyAction} icon="upload"
              onClick={onUploadDataSet} className="primary">
              Upload to OpenAI
            </NekoButton>
          </div>
        </div>}
      </div>
    </NekoContainer>

    <NekoContainer style={{ margin: 10 }}>
      {isModeTrain && section === 'finetunes' && <>
        <p>{toHTML(i18n.FINETUNING.MODELS_INTRO)}</p>
        <NekoTable busy={busy}
          data={fineTuneRows} columns={fineTuneColumns} 
          emptyMessage={i18n.FINETUNING.NO_FINETUNES_YET}
        />
        <div style={{ marginTop: 5, display: 'flex', justifyContent: 'end', lineHeight: '12px',
          alignItems: 'center' }}>
          <NekoButton small disabled={busyAction} busy={busyAction === 'loading'}
            onClick={onCleanFineTunes} className="primary">
            {i18n.FINETUNING.CLEAN_MODELS_LIST}
          </NekoButton>
          <small style={{ marginLeft: 5 }}>{i18n.FINETUNING.DELETED_FINETUNE_ISSUE}</small>
        </div>
        
      </>}

      {isModeTrain && section === 'files' && <>
        <p>{toHTML(i18n.FINETUNING.DATASETS_INTRO)}</p>
        <NekoTable busy={busy}
          data={fileRows} columns={fileColumns} 
          emptyMessage={<>You do not have any dataset files yet.</>}
        />
      </>}

      {!isModeTrain && dataSection === 'generator' && <>
        <DatasetEditor setBuilderData={setBuilderData} />
      </>}

      {!isModeTrain && dataSection === 'editor' && <>
        {!hasStorageBackup && <p style={{ color: NekoTheme.red }}>{i18n.FINETUNING.HUGE_DATASET_WARNING}</p>}
        <div style={{ display: 'flex' }}>
          <NekoButton icon="plus" onClick={() => addRow()}>Add Entry</NekoButton>
          <NekoButton disabled={!totalRows} className="secondary" onClick={onFormatWithDefaults}>
            Format with Defaults
          </NekoButton>
          <NekoUploadDropArea ref={ref} onSelectFiles={onSelectFiles} accept={''} style={{ paddingLeft: 5 }}>
            <NekoButton className="secondary" onClick={() => ref.current.click() }>
              Import File
            </NekoButton>
          </NekoUploadDropArea>
          <NekoButton disabled={!totalRows} className="secondary" style={{ marginLeft: 5 }}
            onClick={exportAsCSV}>
            Export as CSV
          </NekoButton>
          <NekoButton disabled={!totalRows} onClick={() => onResetBuilder()} className="danger">
            Reset Entries
          </NekoButton>
          <div style={{ flex: 'auto' }} />
          <NekoPaging currentPage={currentPage} limit={rowsPerPage} total={totalRows}
              onCurrentPageChanged={setCurrentPage} onClick={setCurrentPage} />
        </div>
      </>}

      {!isModeTrain && <>
        <NekoSpacer height={20} />
        <NekoTable busy={busy}
          data={builderRows} columns={builderColumns}
          emptyMessage={<>You can import a file, or create manually each entry by clicking <b>Add Entry</b>.</>}
        />
        <NekoSpacer height={20} />
        <div style={{ display: 'flex', justifyContent: 'end' }}>
          <NekoPaging currentPage={currentPage} limit={rowsPerPage} total={totalRows}
            onCurrentPageChanged={setCurrentPage} onClick={setCurrentPage} />
        </div>
        <NekoSpacer height={40} line style={{ marginBottom: 0 }} />

        {dataSection === 'generator' && <NekoMessage variant="danger" style={{ marginTop: 0, marginBottom: 25 }}>
          Use this feature with caution. The AI will generate questions and answers for each of your post based on the given prompt, and they will be added to your dataset. Keep in mind that this process may be <u>extremely slow</u> and require a <u>significant number of API calls</u>, resulting in a costs (the tokens count is displayed next to the progress bar). Also, please note that for now, for some reason, the model doesn't seem to provide as many questions as we ask (contrary to ChatGPT).
        </NekoMessage>}

        {dataSection === 'editor' && <>
          <p>
            You can create your dataset by importing a file (two columns, in the CSV, JSON or JSONL format) or manually by clicking <b>Add Entry</b>. To avoid losing your work, this data is kept in your browser's local storage. <b>This is actually complex, so learn how to write datasets by studying <a href="https://beta.openai.com/docs/guides/fine-tuning/conditional-generation" target="_blank">case studies</a>. Please also check my <a href="https://meowapps.com/wordpress-chatbot-finetuned-model-ai/" target="_blank">simplified tutorial</a>.</b> Is your dataset ready? Modify the filename to your liking and click <b>Upload to OpenAI</b> 😎 Some extra notes for you:
          </p>

          <ul>
            <li>• The prompt and the completion should both end with their own special endings. By default, it is <b>\n\n===\n\n</b> for the prompt, and <b>\n\n</b> for the completion. The icon ✅ will be shown next to the prompt and/or completion when this format has been validated, and the ending will be hidden for clarity. I refer to this format (and models trained on it) by the term of <b>Casually Fine Tuned</b>.</li>
            <li>• <b>\n</b> is a line break. You can add line breaks by using <b>SHIFT+ENTER</b> while editing.</li>
            <li> • The <b>Format with Defaults</b> button will add the <i>Casually Fine Tuned</i> endings format to the prompt and completion, if they are missing.</li>
            <li>• If you need the chatbot to work with a <b>Casually Fined Tuned</b> model, you can add <i>casually_fine_tuned="true"</i>  in the shortcode.</li>
          </ul>
        </>}
      </>}

      <NekoModal isOpen={errorModal}
        title="Error"
        onOkClick={() => setErrorModal() }
        onRequestClose={() => setErrorModal() }
        ok="Ok"
        content={<>
          <p>{errorModal?.message}</p>
        </>}
      />

      <NekoModal isOpen={fileForFineTune}
        title="Train a new model"
        onOkClick={onStartFineTune}
        onRequestClose={() => setFileForFineTune() }
        onCancelClick={() => setFileForFineTune() }
        ok="Start"
        disabled={busyAction}
        content={<>
          <p>
            Exciting! 🎵 You are about to create your own new model, based on your dataset. You simply need to select a base model, and optionally, to modify the <a href="https://beta.openai.com/docs/guides/fine-tuning/hyperparameters" target="_blank">hyperparameters</a>. Before starting the process, make sure that:
          </p>
          <ul>
            <li>✅ The dataset is well-defined.</li>
            <li>✅ You understand <a href="https://openai.com/api/pricing/#faq-fine-tuning-pricing-calculation" target="_blank">OpenAI pricing</a> about fine-tuning.</li>
          </ul>
          <label>Base model:</label>
          <NekoSpacer height={5} />
          <NekoSelect value={model} scrolldown={true} onChange={setModel}>
            {finetunableModels.map((x) => (
              <NekoOption value={x.model} label={x.name}></NekoOption>
            ))}
          </NekoSelect>
          <NekoSpacer height={5} />
          <small>For now, the hyperparameters can't be modified - they are set automatically by OpenAI.</small>
          <NekoSpacer height={10} />
          <label>Suffix (for new model name):</label>
          <NekoSpacer height={5} />
          <NekoInput value={suffix} onChange={setSuffix} />
          <NekoSpacer height={5} />
          <small>The name of the new model name will be decided by OpenAI. You can customize it a bit with this <a href="https://beta.openai.com/docs/api-reference/fine-tunes/list#fine-tunes/create-suffix" target="_blank">prefix</a>. Preview: <b>{modelNamePreview}</b>.</small>
          <NekoSpacer line height={20} />
          <NekoCheckbox label="Enable HyperParams" checked={hyperParams}
            onChange={setHyperParams} />
          {hyperParams && <>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <label style={{ marginRight: 5 }}>Number of Epochs:</label>
              <NekoInput style={{ marginRight: 5 }} value={nEpochs} onChange={setNEpochs} type="number" />
              <label style={{ marginRight: 5 }}>Batch Size:</label>
              <NekoInput value={batchSize} onChange={setBatchSize} type="number" />
            </div>
          </>}
        </>
        }
      />
    </NekoContainer>
  </>);
};

export default Finetunes;