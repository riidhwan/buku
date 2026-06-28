import { routes } from './explore.routes';

describe('Explore routes', () => {
  it('loads Explore route components', async () => {
    const shell = routes[0];
    const children = shell?.children ?? [];
    const landingRoute = children.find((route) => route.path === '');
    const browserRoute = children.find((route) => route.path === 'browser');
    const tabsRoute = children.find((route) => route.path === 'browser/tabs');

    expect(await landingRoute?.loadComponent?.()).toBeTruthy();
    expect(await tabsRoute?.loadComponent?.()).toBeTruthy();
    expect(browserRoute).toEqual(
      jasmine.objectContaining({
        redirectTo: '',
        pathMatch: 'full',
      }),
    );
  });

  it('redirects the legacy reader route to the Explore Browser landing route', () => {
    const shell = routes[0];
    const readerRoute = shell?.children?.find((route) => route.path === 'reader');

    expect(readerRoute).toEqual(
      jasmine.objectContaining({
        redirectTo: '',
        pathMatch: 'full',
      }),
    );
  });
});
