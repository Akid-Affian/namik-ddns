import type { APIRoute } from 'astro';
import { getIP } from '../../lib/fetch-ip';

export const GET: APIRoute = async ({ clientAddress }) => {
  const ipAddress = getIP({ clientAddress });

  // Return the IP in JSON format
  return new Response(
    JSON.stringify({ ip: ipAddress }), // Return the IP in a JSON response
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
};
