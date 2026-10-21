#!/bin/sh
# Copies Caddy's certificate for the MX hostname to a volume the engine (uid 1000) can read.
# Checks every 30 s until the first certificate exists, then hourly.
set -eu
SRC="/caddy/caddy/certificates/acme-v02.api.letsencrypt.org-directory/${MX_HOSTNAME}"
while true; do
	if [ -f "$SRC/$MX_HOSTNAME.crt" ] && [ -f "$SRC/$MX_HOSTNAME.key" ]; then
		if ! cmp -s "$SRC/$MX_HOSTNAME.crt" /certs/mx.crt 2>/dev/null; then
			# Key first, cert last: the engine reloads when the cert changes.
			install -m 600 -o 1000 -g 1000 "$SRC/$MX_HOSTNAME.key" /certs/mx.key.new && mv /certs/mx.key.new /certs/mx.key
			install -m 644 -o 1000 -g 1000 "$SRC/$MX_HOSTNAME.crt" /certs/mx.crt.new && mv /certs/mx.crt.new /certs/mx.crt
			echo "certsync: certificate for $MX_HOSTNAME updated"
		fi
		sleep 3600
	else
		sleep 30
	fi
done
