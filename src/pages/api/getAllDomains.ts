import type { APIRoute } from 'astro';
import { db } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {

    interface AppConfig {
      base_domain?: string;
    }

    const baseDomainRow = db.prepare("SELECT base_domain FROM app_config WHERE id = 1").get() as AppConfig;

    const baseDomain = baseDomainRow?.base_domain || 'default_base_domain';

    const domainInfo = [{
      id: 1, 
      zone: baseDomain, 
      masters: [],  
      notified_serial: 1,  
      serial: 1,  
      last_check: Math.floor(Date.now() / 1000),  
      kind: 'native'  
    }];

    const response = {
      result: domainInfo
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to fetch domains:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
