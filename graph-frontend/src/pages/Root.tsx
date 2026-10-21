import React from 'react';
import App from '../App';
import { Landing } from './Landing';
import { AccountDemo, GatewayTokensDemo, ProviderKeysDemo, SignInDemo } from './DemoPages';

function currentRoute(): string {
  return window.location.hash.replace(/^#/, '') || '/';
}

// Minimal hash router (no react-router dependency): '/' landing, '/app' workspace,
// '/demo/*' demo pages.
export function Root() {
  const [route, setRoute] = React.useState(currentRoute);
  React.useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  if (route.startsWith('/app')) return <App />;
  switch (route) {
    case '/demo/signin':
      return <SignInDemo />;
    case '/demo/keys':
      return <ProviderKeysDemo />;
    case '/demo/tokens':
      return <GatewayTokensDemo />;
    case '/demo/account':
      return <AccountDemo />;
    default:
      return <Landing />;
  }
}
