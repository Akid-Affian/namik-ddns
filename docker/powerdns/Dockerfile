FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    apt-transport-https \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN install -d /etc/apt/keyrings

RUN curl https://repo.powerdns.com/FD380FBB-pub.asc | tee /etc/apt/keyrings/auth-49-pub.asc \
    && echo "deb [signed-by=/etc/apt/keyrings/auth-49-pub.asc] http://repo.powerdns.com/debian bullseye-auth-49 main" > /etc/apt/sources.list.d/pdns.list

RUN echo "Package: auth*" > /etc/apt/preferences.d/auth-49 \
    && echo "Pin: origin repo.powerdns.com" >> /etc/apt/preferences.d/auth-49 \
    && echo "Pin-Priority: 600" >> /etc/apt/preferences.d/auth-49

RUN apt-get update && apt-get install -y \
    pdns-server \
    pdns-backend-remote \
    && rm -rf /var/lib/apt/lists/*

COPY ./pdns.conf /etc/powerdns/pdns.conf

EXPOSE 53/tcp
EXPOSE 53/udp

CMD ["pdns_server", "--guardian=no", "--daemon=no", "--loglevel=9"]
