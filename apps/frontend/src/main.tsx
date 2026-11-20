import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntdApp, ConfigProvider } from 'antd';
import 'antd/dist/reset.css';
import App from './App.tsx';
import { printStellodeAsciiLogo } from './brand/printStellodeAsciiLogo';
import { UnitProvider } from './context/UnitContext';
import { StatusWarningProvider } from './context/StatusWarningContext';

printStellodeAsciiLogo();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ConfigProvider>
      <UnitProvider>
        <AntdApp>
          <StatusWarningProvider>
            <App />
          </StatusWarningProvider>
        </AntdApp>
      </UnitProvider>
    </ConfigProvider>
  </StrictMode>,
);
