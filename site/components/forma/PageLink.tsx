import type {ComponentProps} from 'react';
// Full document navigation keeps file-upload and checkout routes reliable and
// preserves the temporary cart through its tab-scoped sessionStorage draft.
export function PageLink(props:ComponentProps<'a'>){return <a {...props}/>}
