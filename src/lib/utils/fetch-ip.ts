import type { APIContext } from 'astro';

export function getIP({ clientAddress }: Pick<APIContext, 'clientAddress'>) {
  return clientAddress || '';
}
