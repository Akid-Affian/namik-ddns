import type { APIRoute } from 'astro';
import { db } from '../../../lib/database/db';
import type { RequestBody } from '../../../types/RequestBody';

export const POST: APIRoute = async ({ request }) => {
  try {
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Content-Type', 'application/json');

    const { baseDomain, nameServer }: RequestBody = await request.json();

    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;

    // Validate the baseDomain
    if (!baseDomain || !domainRegex.test(baseDomain)) {
      console.error('Invalid input:', { baseDomain });
      return new Response(JSON.stringify({ error: 'Invalid base domain' }), {
        status: 400,
        headers: headers,
      });
    }

    // Check if nameServer is provided
    if (!nameServer || (Array.isArray(nameServer) && nameServer.length === 0)) {
      console.error('No name servers provided');
      return new Response(JSON.stringify({ error: 'No name servers provided. Request refused.' }), {
        status: 400,
        headers: headers,
      });
    }

    // If nameServer is an array, check that there are no more than 6 nameservers
    if (Array.isArray(nameServer) && nameServer.length > 6) {
      console.error('Too many name servers provided');
      return new Response(JSON.stringify({ error: 'Maximum of 6 nameservers allowed' }), {
        status: 400,
        headers: headers,
      });
    }

    // Validate each nameserver using the domain regex
    const nameServersToValidate = Array.isArray(nameServer) ? nameServer : [nameServer];
    
    // Check if the base domain is the same as any nameserver
    if (nameServersToValidate.includes(baseDomain)) {
      console.error('Base domain cannot be the same as a nameserver:', baseDomain);
      return new Response(JSON.stringify({ error: 'Base domain cannot be the same as a nameserver' }), {
        status: 400,
        headers: headers,
      });
    }

    // Check for duplicate nameservers
    const uniqueNameservers = new Set(nameServersToValidate);
    if (uniqueNameservers.size !== nameServersToValidate.length) {
      console.error('Duplicate nameservers found');
      return new Response(JSON.stringify({ error: 'Duplicate nameservers are not allowed' }), {
        status: 400,
        headers: headers,
      });
    }

    for (const ns of nameServersToValidate) {
      if (!domainRegex.test(ns)) {
        console.error('Invalid nameserver format:', ns);
        return new Response(JSON.stringify({ error: `Invalid nameserver format: ${ns}` }), {
          status: 400,
          headers: headers,
        });
      }
    }

    const now = Date.now();

    // Insert DNS records for provided name servers
    const insertDnsRecordStmt = db.prepare(`
      INSERT INTO dns_records (domain_id, record_type, content, ttl, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Handle both single and multiple nameservers
    let systemOwnedDomains: string[] = [];
    
    if (typeof nameServer === 'string') {
      // If it's a single nameserver string, check if it's a subdomain of the base domain
      if (nameServer.endsWith(`.${baseDomain}`)) {
        systemOwnedDomains.push(nameServer); // Add to system-owned if it's a subdomain
      }
      insertDnsRecordStmt.run(null, 'NS', nameServer, 60, now, now);
      
      // Insert an ALIAS record for the base domain using the provided nameserver
      insertDnsRecordStmt.run(null, 'ALIAS', nameServer, 60, now, now);
    } else if (Array.isArray(nameServer)) {
      // If it's an array, check each nameserver and insert accordingly
      for (const ns of nameServer) {
        if (ns.endsWith(`.${baseDomain}`)) {
          systemOwnedDomains.push(ns); // Add to system-owned if it's a subdomain
        }
        insertDnsRecordStmt.run(null, 'NS', ns, 60, now, now);
      }
      
      // Insert an ALIAS record for the base domain using the first nameserver in the array
      insertDnsRecordStmt.run(null, 'ALIAS', nameServer[0], 60, now, now);
    }

    // SOA Record creation
    const soaContent = `${baseDomain} hostmaster.${baseDomain} 1 3600 1800 1209600 3600`;
    insertDnsRecordStmt.run(null, 'SOA', soaContent, 3600, now, now);

    // Insert domain information with user_id = null to indicate system ownership
    const insertDomainStmt = db.prepare(`
      INSERT INTO domains (user_id, domain_name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    insertDomainStmt.run(null, `hostmaster.${baseDomain}`, now, now);  // user_id = null for system-owned domains

    // Insert system-owned nameservers as subdomains
    for (const systemDomain of systemOwnedDomains) {
      insertDomainStmt.run(null, systemDomain, now, now);
    }

    // Update app configuration to store the base domain
    const updateAppConfigStmt = db.prepare(`
      UPDATE app_config
      SET base_domain = ?, updated_at = ?
      WHERE id = 1
    `);
    updateAppConfigStmt.run(baseDomain, now);

    return new Response(
      JSON.stringify({
        message: 'Configuration updated and DNS records created successfully.',
      }),
      {
        status: 200,
        headers: headers,
      }
    );
  } catch (error) {
    console.error('Error during setup POST:', error);
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Content-Type', 'application/json');
    return new Response(
      JSON.stringify({
        error: 'An error occurred while updating the configuration',
      }),
      {
        status: 500,
        headers: headers,
      }
    );
  }
};

export const OPTIONS: APIRoute = async () => {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return new Response(null, {
    status: 204,
    headers: headers,
  });
};
