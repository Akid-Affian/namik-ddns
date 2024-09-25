# API Specification

The application uses a simple GET API to update your domain(s).

The GET API is similar to the DuckDNS API. If you are familiar with it, you'll find this API easy to use. To update your domain(s), you can make a single HTTPS GET request to your configured domain using the following format:

```
https://example.com/update?domains={YOURVALUE}&token={YOURVALUE}[&ip={YOURVALUE}][&ipv6={YOURVALUE}][&verbose=true][&clear=true]
```

### Parameters

- **domains** - **REQUIRED** - Full domain names must be specified. For example, use `mywebsite.example.com` instead of just `mywebsite`. You can provide a list of domains separated by commas.
- **token** - **REQUIRED** - Your account token or API key. You can find your API key on the dashboard page.
- **ip** - **OPTIONAL** - If left blank, the app will attempt to auto-detect the IP address (IPv4 or IPv6). You can also supply a valid IPv4 or IPv6 address.
- **ipv6** - **OPTIONAL** - A valid IPv6 address.
- **verbose** - **OPTIONAL** - If set to true, you get detailed information about how the request was processed.
- **clear** - **OPTIONAL** - If set to true, the update will ignore all IPs and clear both your records.

### Example Request (IPv4 and IPv6)

To update a specific domain with an IPv4 address:

```
https://example.com/update?domains=mywebsite.example.com&token=put-your-token-here&ip=1.1.1.1&verbose=true
```

Or to update with an IPv6 address:

```
https://example.com/update?domains=mywebsite.example.com&token=put-your-token-here&ip=2001:4860:4860::8888&verbose=true
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

If you add the `&verbose=true` parameter to your request, successful responses will provide more information:

```
OK
8.8.8.8 [The current IPV4 address for your update - can be blank if you did not request an IPV4 update]
2001:db8::2 [The current IPV6 address for your update - can be blank if you did not request an IPV6 update]
UPDATED [UPDATED or NOCHANGE]
```

### Special No-Parameter Request Format

For basic routers that can only make requests without parameters, the following request format is available:

```
https://example.com/update/{YOURDOMAIN}/{YOURTOKEN-OR-APIKEY}[/{YOURIPADDRESS}]
```

- **YOURDOMAIN** - **REQUIRED** - Your registered subdomain (must be fully specified, e.g., `mywebsite.example.com`).
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
https://example.com/update?domains=mywebsite.example.com&token=mytoken&txt=mytext&verbose=true
```

A normal **good response** is:

```
OK
```

A normal **bad response** is:

```
KO
```

If you add the `&verbose=true` parameter to your request, successful responses will provide more information:

```
OK
TXT=some-text [The current TXT record for your update]
UPDATED [UPDATED or NOCHANGE]
```

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
