# r2_nas_puller — R2 → NAS archive puller

Cloudflare Workers/R2 live in the cloud and **cannot reach into your home LAN**, so the
NAS pulls: it lists images the worker staged in R2, downloads each, writes it durably to
the NAS, then `/ack`s — and only on ack does the worker delete the R2 copy
(**delete-after-ack**: an image leaves R2 only once it is durably on the NAS, so a failed
or partial pull never loses data; it stays staged for the next pass).

Integrity per image: the download is accepted only if its length equals the catalog's
`size` **and** it is a PNG; the file is `fsync`'d (file + parent dir) before `/ack`, written
atomically (`.part` + `os.replace`), and confined under `IMG2_DEST` (realpath guard).

## Where it runs (current deployment)

| | |
|---|---|
| Host | the home NAS — UGREEN DXP4800 Plus, 16 GB, reflashed to **Proxmox VE** (`Host nas` / `gpu19`, `192.168.7.19`) |
| Archive dir | `IMG2_DEST=/srv/Archive16T/image2` (the 17 TB archive pool; layout `img/<date>/<device>/<thread_id>__<name>.png`) |
| Script | `/opt/r2_nas_puller.py` |
| Service | `img2-puller.service` (systemd, loop mode, `Restart=always`, enabled at boot) |
| Cadence | every `IMG2_INTERVAL=300` s |

## Install

```bash
# 1. script
install -m 0755 r2_nas_puller.py /opt/r2_nas_puller.py

# 2. env file (root-only; IMG2_TOKEN = the worker AUTH_TOKEN, same value as each device's
#    ~/.codex/image2-counter.json "token"). Pipe it in so it never lands in shell history:
umask 077
cat > /etc/img2-puller.env <<EOF
IMG2_ENDPOINT=https://img2-counter.<your-acct>.workers.dev
IMG2_TOKEN=<worker AUTH_TOKEN>
IMG2_DEST=/srv/Archive16T/image2
IMG2_INTERVAL=300
EOF
chmod 600 /etc/img2-puller.env

# 3. service
install -m 0644 img2-puller.service /etc/systemd/system/img2-puller.service
systemctl daemon-reload
systemctl enable --now img2-puller.service
```

`IMG2_ONCE=1` (instead of `IMG2_INTERVAL`) runs a single drain pass and exits — use it for a
cron job instead of the long-running service.

## Operate

```bash
systemctl status img2-puller          # health
journalctl -u img2-puller -f          # live log (one line per archived image)
# what got generated today, and where it is now:
curl -s -H "Authorization: Bearer <token>" -H "User-Agent: x" \
  https://img2-counter.<acct>.workers.dev/audit?date=$(date +%F) | jq
```
