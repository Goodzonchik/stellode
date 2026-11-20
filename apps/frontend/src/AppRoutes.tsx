import type { ReactElement } from 'react';
import { lazy } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import {
  applicationVersionDiagramPath,
  serviceSpaDiagramPath,
} from './pages/diagrams/spa-diagram-paths';
import { appNavPages, isAppGroupPage, isAppLeafPage } from './navigation/app-nav-pages';

const UnitsPage = lazy(() =>
  import('./pages/units/units').then((module) => ({ default: module.Units })),
);
const ApplicationsPage = lazy(() =>
  import('./pages/applications/Applications').then((module) => ({
    default: module.Applications,
  })),
);
const ServicesPage = lazy(() =>
  import('./pages/services/Services').then((module) => ({ default: module.Services })),
);
const FeaturesPage = lazy(() =>
  import('./pages/features/Features').then((module) => ({ default: module.Features })),
);
const TeamsPage = lazy(() =>
  import('./pages/teams/Teams').then((module) => ({ default: module.Teams })),
);
const ComponentsPage = lazy(() =>
  import('./pages/components/Components').then((module) => ({ default: module.Components })),
);
const DiagramsPage = lazy(() =>
  import('./pages/diagrams/Diagrams').then((module) => ({ default: module.Diagrams })),
);
const FeatureVersionsPage = lazy(() =>
  import('./pages/feature-versions/FeatureVersions').then((module) => ({
    default: module.FeatureVersions,
  })),
);
const ApplicationVersionsPage = lazy(() =>
  import('./pages/application-versions/ApplicationVersions').then((module) => ({
    default: module.ApplicationVersions,
  })),
);
const ComponentVersionsPage = lazy(() =>
  import('./pages/component-versions/ComponentVersions').then((module) => ({
    default: module.ComponentVersions,
  })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFound').then((module) => ({ default: module.NotFound })),
);
const ApplicationCompositionPage = lazy(() =>
  import('./pages/diagrams/ApplicationComposition').then((module) => ({
    default: module.ApplicationComposition,
  })),
);

const ApplicationCompositionCurrentRedirect = () => {
  const { id } = useParams();
  return id ? (
    <Navigate to={applicationVersionDiagramPath(id, 'current')} replace />
  ) : (
    <NotFoundPage />
  );
};

const CrossUnitDiagramPage = lazy(() =>
  import('./pages/diagrams/CrossUnitDiagram').then((module) => ({
    default: module.CrossUnitDiagram,
  })),
);
const FeatureDiagramRedirectPage = lazy(() =>
  import('./pages/diagrams/FeatureDiagramRedirect').then((module) => ({
    default: module.FeatureDiagramRedirect,
  })),
);
const ReleaseWizardPage = lazy(() =>
  import('./pages/application-versions/ReleaseWizard').then((module) => ({
    default: module.ReleaseWizard,
  })),
);
const HelpPage = lazy(() =>
  import('./pages/help/Help').then((module) => ({ default: module.Help })),
);
const HelpRedirectPage = lazy(() =>
  import('./pages/help/HelpRedirect').then((module) => ({
    default: module.HelpRedirect,
  })),
);
const MermaidToolsPage = lazy(() =>
  import('./pages/tools/MermaidToolsPage').then((module) => ({
    default: module.MermaidToolsPage,
  })),
);

const ServiceDiagramRedirect = () => {
  const { id } = useParams();
  return id ? <Navigate to={serviceSpaDiagramPath(id)} replace /> : <NotFoundPage />;
};

const toRoutePath = (absolutePath: string): string => absolutePath.replace(/^\//, '');

const listPageElementsById: Readonly<Record<string, ReactElement>> = {
  units: <UnitsPage />,
  applications: <ApplicationsPage />,
  services: <ServicesPage />,
  features: <FeaturesPage />,
  teams: <TeamsPage />,
  components: <ComponentsPage />,
};

const toolPageElementsById: Readonly<Record<string, ReactElement>> = {
  'tools-mermaid': <MermaidToolsPage />,
};

const listNavPages = appNavPages
  .filter(isAppLeafPage)
  .filter((page) => page.id !== 'help')
  .filter((page) => page.id in listPageElementsById);

const toolNavChildren = appNavPages.filter(isAppGroupPage).flatMap((page) => page.children);

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/units" replace />} />
    {listNavPages.map((page) => (
      <Route
        key={page.id}
        path={toRoutePath(page.path)}
        element={listPageElementsById[page.id]}
      />
    ))}
    {toolNavChildren.map((child) => (
      <Route
        key={child.id}
        path={toRoutePath(child.path)}
        element={toolPageElementsById[child.id]}
      />
    ))}
    <Route path="help" element={<HelpRedirectPage />} />
    <Route path="help/:slug" element={<HelpPage />} />

    <Route path="units/:id/diagram/cross-unit" element={<CrossUnitDiagramPage />} />
    <Route path="units/:id/diagram" element={<DiagramsPage />} />
    <Route path="teams/:id/diagram" element={<DiagramsPage />} />
    <Route path="services/:id/diagram/integrations" element={<DiagramsPage />} />
    <Route path="services/:id/diagram" element={<DiagramsPage />} />
    <Route path="services/:id" element={<ServiceDiagramRedirect />} />
    <Route path="features/:id/diagram" element={<FeatureDiagramRedirectPage />} />
    <Route path="feature-versions/:id/diagram" element={<DiagramsPage />} />
    <Route path="components/:id/diagram" element={<DiagramsPage />} />
    <Route
      path="applications/:id/versions/:version/diagram"
      element={<ApplicationCompositionPage />}
    />
    <Route path="applications/:id/diagram" element={<ApplicationCompositionCurrentRedirect />} />

    <Route path="features/:id" element={<FeatureVersionsPage />} />
    <Route path="applications/:id/release" element={<ReleaseWizardPage />} />
    <Route path="applications/:id" element={<ApplicationVersionsPage />} />
    <Route path="components/:id" element={<ComponentVersionsPage />} />

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
