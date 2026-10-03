import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Forma3D — Material World',description:'A digital material lab. Explore printed forms, upload your STL or 3MF, and make a physical object in Jubail.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
