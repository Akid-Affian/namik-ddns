import type { APIRoute } from 'astro';
import { db } from '@lib/database/db';
import type { AppConfig } from '../../../types/AppConfig';

export const GET: APIRoute = async () => {
  try {
    const baseDomainRow = db.prepare("SELECT base_domain FROM app_config WHERE id = 1").get() as AppConfig;
    const baseDomain = baseDomainRow?.base_domain || 'default_base_domain';

    // Base domain info with reserved id = 1
    const domainInfo = [{
      id: 1, 
      zone: baseDomain,
      masters: [],  
      notified_serial: 1,  
      serial: 1,  
      last_check: Math.floor(Date.now() / 1000),
      kind: 'native'
    }];

    const additionalDomains = db.prepare("SELECT domain_name FROM additional_domains").all() as { domain_name: string }[];

    // Assign unique sequential ids starting from 2 for additional domains
    const additionalDomainInfo = additionalDomains.map((domain, index) => ({
      id: index + 2,  // Start IDs from 2 onward for additional domains
      zone: domain.domain_name, 
      masters: [],  
      notified_serial: 1,  
      serial: 1,  
      last_check: Math.floor(Date.now() / 1000),
      kind: 'native'
    }));

    const allDomainInfo = [...domainInfo, ...additionalDomainInfo];

    const response = {
      result: allDomainInfo
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
