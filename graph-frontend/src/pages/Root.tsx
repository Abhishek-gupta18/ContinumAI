import React, { Suspense, lazy } from 'react';
import { Landing } from './Landing';

const App = lazy(() => import('../App').then(m => ({ default: m.default })));

const SignInDemo = lazy(() => import('./DemoPages').then(m => ({ default: m.SignInDemo })));
const ProviderKeysDemo = lazy(() => import('./DemoPages').then(m => ({ default: m.ProviderKeysDemo })));
const GatewayTokensDemo = lazy(() => import('./DemoPages').then(m => ({ default: m.GatewayTokensDemo })));
const AccountDemo = lazy(() => import('./DemoPages').then(m => ({ default: m.AccountDemo })));

function currentRoute(): string {
  return window.location.hash.replace(/^#/, '') || '/';
}

export function Root() {
  const [route, setRoute] = React.useState(() => window.location.hash.replace(/^#/, '') || '/');
  React.useEffect(() => {
    const onChange = () => setRoute(window.location.hash.replace(/^#/, '') || '/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0e0b16' }} />}>
      {route.startsWith('/app') ? <App /> : (
        route.startsWith('/demo') ? (() => {
          switch (route) {
            case '/demo/signin': return <SignInDemo />;
            case '/demo/keys': return <ProviderKeysDemo />;
            case '/demo/tokens': return <GatewayTokensDemo />;
            case '/demo/account': return <AccountDemo />;
            default: return <Landing />;
          }
        })() : <Landing />
      )}
    </Suspense>
  );
}