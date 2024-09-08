# Namik-DDNS

| [![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/Akid-Affian/namik-ddns/blob/main/LICENSE) | [![Telegram Chat](https://img.shields.io/badge/Chat-Telegram-blue.svg)](https://t.me/namikddns) |
|---------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|

A complete self-hosted DDNS solution alternative to DuckDNS.

![Home page](https://raw.githubusercontent.com/Akid-Affian/namik-ddns/main/public/image1.png)

![Dashboard page](https://raw.githubusercontent.com/Akid-Affian/namik-ddns/main/public/image2.png)

# Self-Hosting
Requirements

- A custom domain. If you're using an apex domain, you'll need to set up glue records, or you can use a different domain for nameservers to avoid loopback issues. Learn more [here](https://www.cbtnuggets.com/blog/technology/networking/understanding-dns-glue-records).
- A server with Docker installed, and it should support Docker Compose.

#### TCP Ports:
- `4321` for `namik-ddns`
- `53` for `powerdns` (DNS over TCP)
- `80` and `443` for `caddy` (HTTP/HTTPS)

#### UDP Ports:
- `53` for `powerdns` (DNS over UDP)
## DNS Setup

To set up the DNS, you will need the following records:

- **NS** (Nameserver)
- **A** (for IPv4) or **AAAA** (for IPv6)
- **Glue Records** (if using custom nameservers on the same domain)

For more details on glue records, check [this link](https://serverfault.com/questions/309622/what-is-a-glue-record).

### Using Your Apex Domain (e.g., `website.com`)

If you're using an apex domain (like `website.com`), you'll need to create *glue records*. Glue records ensure that DNS resolvers know the IP address of your custom nameservers.

#### Steps to Set Up Glue Records:
1. In your domain registrar, create at least one custom nameserver (e.g., `ns1.website.com`). Some registrars require two or more nameservers, but you can set up as many as six.

2. For each nameserver (e.g., `ns1.website.com`, `ns2.website.com`), add glue records that point to the IP address (IPv4 or IPv6 or both) of the server hosting your app.

3. Update your DNS zone for `website.com` to use the custom nameservers you just created (`ns1.website.com` and `ns2.website.com`).

4. Lastly, in your `docker-compose.yml` file, replace the following environment variables with your own:
   - `BASE_DOMAIN`
   - `NAMESERVERS`
   - `EMAIL`

### Bypassing Glue Records

If you don’t want to create glue records, you can use another domain for the nameservers, pointing it to your server’s IP address. This setup works just as well.

### Using a Subdomain (e.g., `d.example.com`)

You can also use a subdomain for your app without creating glue records. Here’s how:

1. Create a nameserver record like `nameserver.example.com` with an **A** (or **AAAA**) record that points to your server’s IP address.

2. Use `d.example.com` as your base domain. Create an **NS** record for `d.example.com` that points to `nameserver.example.com`.

3. This will delegate all subdomains under `d.example.com` to the DNS server running at `nameserver.example.com`, allowing you to manage DNS dynamically.

## Installation

The setup is automated using Docker Compose. Just head to `docker/docker-compose.yml` and replace the `BASE_DOMAIN`, `NAMESERVERS`, and `EMAIL` values in the environment section with your own. This step is required for the application, PowerDNS, and Caddy to run properly.

Now you can run the command:

```bash
docker compose up --build
```

Once the containers are up, you can visit `localhost:4321/setup` or `your-ip:4321/setup` to complete the setup and create your account.
## API Reference

Our API is very similar to DuckDNS API see the docs [here](https://www.cbtnuggets.com/blog/technology/networking/understanding-dns-glue-records).


## Support

Join our telegram [here](https://t.me/namikddns)


## License

[MIT](https://github.com/Akid-Affian/namik-ddns/blob/main/LICENSE)

