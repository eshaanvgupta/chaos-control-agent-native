import { useQuery,useMutation,useQueryClient } from '@tanstack/react-query';
import { browserAction } from './store';
export function useActionQuery(name:string,args:any={},options:any={}){return useQuery<any>({queryKey:['browser-action',name,args],queryFn:()=>browserAction(name,args),...options});}
export function useActionMutation(name:string){const queryClient=useQueryClient();return useMutation<any,Error,any>({mutationFn:args=>browserAction(name,args),onSuccess:()=>queryClient.invalidateQueries({queryKey:['browser-action']})});}
