// Previous: none
// Current: 3.6.3

const { render } = wp.element;
import WorkspaceApp from '@app/workspace/WorkspaceApp';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('mwai-workspace');
  if (container) {
    render(<WorkspaceApp />, container);
  }
});
