export type RouteCommand = string | number;

export interface RouteTarget {
  readonly commands: readonly RouteCommand[];
  readonly url: string;
}

export function routeTarget(commands: readonly RouteCommand[]): RouteTarget {
  if (commands.length === 0) {
    throw new Error('RouteTarget requires at least one command.');
  }

  return {
    commands,
    url: commandsToUrl(commands),
  };
}

function commandsToUrl(commands: readonly RouteCommand[]): string {
  const firstCommand = String(commands[0]);
  const isAbsolute = firstCommand.startsWith('/');
  const segments = commands.map((command, index) => {
    const segment = String(command);
    return index === 0 ? segment.replace(/^\/+/, '') : segment;
  });
  const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join('/');

  return isAbsolute ? `/${encodedPath}` : encodedPath;
}
