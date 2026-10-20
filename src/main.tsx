import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import LabPage from './pages/LabPage';
import NotFound from './pages/NotFound';
import ProgressPage from './pages/ProgressPage';
import TrackPage from './pages/TrackPage';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/tracks/:trackId', element: <TrackPage /> },
      { path: '/tracks/:trackId/labs/:labId', element: <LabPage /> },
      { path: '/progress', element: <ProgressPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
