# Use standalone Angular

The app uses standalone Angular components, directives, pipes, and route declarations rather than feature `NgModule` structure. Providers should be placed at route or application boundaries where practical, keeping lazy-loaded features explicit and component tests focused on the dependencies they actually use.
