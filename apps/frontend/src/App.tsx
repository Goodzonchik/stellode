import { Suspense } from 'react';
import { Spin } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';
import { Navigation } from './navigation/Navigation';
import './App.css';

const App = () => (
  <BrowserRouter>
      <Navigation />
      <main className="app-main">
        <Suspense
          fallback={
            <div className="app-main__suspense-fallback">
              <Spin size="large" />
            </div>
          }
        >
          <AppRoutes />
        </Suspense>
      </main>
  </BrowserRouter>
);

export default App;
