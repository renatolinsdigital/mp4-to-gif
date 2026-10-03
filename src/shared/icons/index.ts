export { Icon, type IconName } from './Icon';
// PayPalLogo is left out on purpose: the layout loads this barrel on every page, so exporting
// the logo here would put its artwork in the entry chunk. Import it from './PayPalLogo'.
