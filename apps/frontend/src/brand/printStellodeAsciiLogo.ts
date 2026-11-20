import { stellodeAsciiLogo } from './stellodeAsciiLogo';

const consoleStyle =
  'color:#9BC9D6;font-family:ui-monospace,Consolas,monospace;font-size:12px;line-height:1.15;';

export const printStellodeAsciiLogo = (): void => {
  console.log(`%c${stellodeAsciiLogo}`, consoleStyle);
};
