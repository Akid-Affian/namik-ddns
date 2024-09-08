# API Specification

The application uses a simple GET API to update your domain(s).

The GET API is similar to the DuckDNS API. If you are familiar with it, you'll find this API easy to use. To update your domain(s), you can make a single HTTPS GET request to your configured domain using the following format:

https://example.com/update?domains={YOURVALUE}&token={YOURVALUE}[&ip={YOURVALUE}][&ipv6={YOURVALUE}][&verbose=true][&clear=true]


Replace `{YOURVALUE}`, `{ip}`, `{ipv6}`, `{verbose}`, and `{clear}` with your specific values.

- You can specify a single domain or provide a list of domains separated by commas.
- It's not necessary to include the `.example.com` part—just use the subdomain name.
- If you don't specify an IP address, the system will attempt to auto-detect it (IPv4 or IPv6).
- The `ip` parameter accepts both IPv4 and IPv6 addresses.
- To update both IPv4 and IPv6 records simultaneously, you can use the `ipv6` parameter.
- Use the `clear=true` parameter to remove both IPv4 and IPv6 records.

### Example Request (IPv4 and IPv6)

Note that the app uses "token" and "API key" interchangeably. You can find your API key on the dashboard page.

```
https://example.com/update?domains=mydomain&token=put-your-token-here&ip=1.1.1.1&verbose=true
```

or

```
https://example.com/update?domains=mydomain&token=put-your-token-here&ip=2001:4860:4860::8888&verbose=true
```

### Responses

A normal **good response** is:

```
OK
```

A normal **bad response** is:

```
KO
```

If you add the `&verbose=true` parameter to your request, then OK responses have more information:

```
OK
8.8.8.8 [The current IPV4 address for your update - can be blank if you did not request an IPV4 update]
2001:db8::2 [The current IPV6 address for your update - can be blank if you did not request an IPV6 update]
UPDATED [UPDATED or NOCHANGE]
```

### GET Parameters

- **domains** - **REQUIRED** - Comma-separated list of the subnames you want to update.
- **token** - **REQUIRED** - Your account token or API key.
- **ip** - **OPTIONAL** - If left blank, the app will detect IPv4 or IPv6 addresses. You can also supply a valid IPv4 or IPv6 address.
- **ipv6** - **OPTIONAL** - A valid IPv6 address.
- **verbose** - **OPTIONAL** - If set to true, you get detailed information about how the request was processed.
- **clear** - **OPTIONAL** - If set to true, the update will ignore all IPs and clear both your records.

### Special No-Parameter Request Format

Some very basic routers can only make requests without parameters. For these requirements, the following request is possible:

```
https://example.com/update/{YOURDOMAIN}/{YOURTOKEN-OR-APIKEY}[/{YOURIPADDRESS}]
```

- **YOURDOMAIN** - **REQUIRED** - Your registered subdomain (only a single subdomain).
- **YOURTOKEN-OR-APIKEY** - **REQUIRED** - Your account token or API key.
- **YOURIPADDRESS** - **OPTIONAL** - If left blank, the app will detect IPv4 or IPv6 addresses. You can also supply a valid IPv4 or IPv6 address to override this.

### TXT Record for GET Requests

The TXT update URL can be requested on HTTPS or HTTP. It is recommended that you always use HTTPS. However, the app provides HTTP services for users who have HTTPS blocked.

Your TXT record will apply to all sub-subdomains under your domain (e.g., `xxx.yyy.example.com` shares the same TXT record as `yyy.example.com`).

#### Example:

```
https://example.com/update?domains={YOURVALUE}&token={YOURVALUE}&txt={YOUR-TXT-VALUE}[&verbose=true]
```

#### Example 2:

```
https://example.com/update?domains=mydomain&token=mytoken&txt=mytext&verbose=true
```

A normal **good response** is:

```
OK
```

A normal **bad response** is:

```
KO
```

If you add the `&verbose=true` parameter to your request, then OK responses have more information:

```
OK
TXT=some-text [The current TXT record for your update]
UPDATED [UPDATED or NOCHANGE]
```

### TXT Parameters:

- **domains** - **REQUIRED** - Comma-separated list of the subnames you want to update.
- **token** - **REQUIRED** - Your account token or API key.
- **txt** - **REQUIRED** - The TXT value you require.
- **verbose** - **OPTIONAL** - If set to true, you get information back about how the request went.

### Viewing Your TXT Record

Note that the TXT record does not show up in the web interface. To see your TXT record on Linux or OSX, you can query DNS directly:

```
dig test.example.com TXT
```

This record will also be presented for any sub-subdomain queries:

```
dig sub.test.example.com TXT
```

This can be used, for example, to prove your ownership with Let's Encrypt.
