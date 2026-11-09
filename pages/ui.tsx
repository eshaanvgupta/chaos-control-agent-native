import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ComponentProps,ReactNode } from 'react';
export function Button({type='button',...props}:ComponentProps<'button'>){return <button type={type} {...props}/>;}
export const Dialog=DialogPrimitive.Root;
export const DialogTitle=DialogPrimitive.Title;
export const DialogDescription=DialogPrimitive.Description;
export function DialogContent({children,className,...props}:ComponentProps<typeof DialogPrimitive.Content>){return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="pages-dialog-overlay"/><DialogPrimitive.Content className={`pages-dialog ${className??''}`} {...props}>{children}<DialogPrimitive.Close aria-label="Close dialog" className="pages-dialog-close">×</DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>;}
