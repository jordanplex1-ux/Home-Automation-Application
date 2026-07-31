# HomeSync automation stack

Mosquitto → Zigbee2MQTT → Home Assistant, on a dedicated Ubuntu Server box
sited centrally in the house.

The Home Planner wall panel is **not** part of this stack. It stays "just
glass" — a client of Home Assistant's WebSocket/REST API. Nothing
house-critical depends on the Windows panel being awake.

```
SNZB-02M ──Zigbee──> ZBDongle-P ──USB──> Zigbee2MQTT ──MQTT──> Mosquitto
                                                                   │
                                                          Home Assistant
                                                                   │
                                                    Home Planner (wall panel)
```

## 1. Operating system

**Ubuntu Server 26.04 LTS** (not Desktop — a GNOME session would idle away
~1.5GB of the box's 6GB for no benefit; everything here is a web UI).

During install: enable **OpenSSH server**, set a **static IP** (or a DHCP
reservation — HA, Z2M and the wall panel all need it stable).

## 2. Post-install

Headless boxes still suspend unless told not to:

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

In **BIOS**, set *Restore on AC Power Loss* → **Power On**. Without it a power
blip means the heating stays off until someone notices.

Disable the onboard **WiFi and Bluetooth** if you're on wired Ethernet — their
2.4GHz radios sitting inches from the Zigbee coordinator are self-inflicted
interference. (This box has dual gigabit NICs; one leg on the IoT VLAN and one
on management is a tidy split.)

Install Docker from Docker's own repository (not Ubuntu's `docker.io`, which
lags): https://docs.docker.com/engine/install/ubuntu/

## 3. Site the radio

Put the ZBDongle-P on a **1–2m USB extension cable**, away from the chassis and
the SSD. This is not optional on this hardware: the box has only USB 3.0 ports,
and USB 3.0 emits broadband 2.4GHz noise that is *the* most common cause of a
flaky mesh.

Battery sensors do not route traffic. The mesh only gets stronger when you add
**mains-powered** Zigbee devices (smart plugs, bulbs) as routers.

## 4. Bring the stack up

```bash
git clone https://github.com/jordanplex1-ux/Home-Automation-Application.git
cd Home-Automation-Application/infra/homesync
```

Create the broker password (replace `homesync` with your chosen username):

```bash
docker run --rm -it -v "$PWD/mosquitto/config:/mosquitto/config" eclipse-mosquitto:2 mosquitto_passwd -c /mosquitto/config/passwd homesync
```

Point Zigbee2MQTT at the same credentials:

```bash
cp zigbee2mqtt/data/secret.yaml.example zigbee2mqtt/data/secret.yaml
```

Find the dongle's stable device path and paste it into `docker-compose.yml`
(replace the `CHANGE_ME` line):

```bash
ls -l /dev/serial/by-id/
```

Then:

```bash
docker compose up -d
```

## 5. Pair the SNZB-02M

Open the Zigbee2MQTT frontend at `http://<box-ip>:8080`.

1. **Permit join** (with a timeout), then hold the sensor's button ~5s until
   its LED flashes.
2. It joins as `SNZB-02M`, exposing temperature, humidity, pressure and
   battery. Give it a friendly name.
3. **Turn permit-join back off.** Leaving a Zigbee network open to joining is
   the equivalent of leaving WPS enabled.

The SNZB-02M is fully supported by Zigbee2MQTT (ZHA only supports it
partially, which is why the stack uses Z2M).

## 6. Home Assistant

Open `http://<box-ip>:8123` and complete onboarding. The **MQTT integration**
should be offered automatically via discovery — point it at `127.0.0.1:1883`
with the credentials above. Every Zigbee2MQTT device then appears as HA
entities without further plumbing.

## 7. Firewall

Only the LAN (or better, just the management VLAN and the wall panel) needs to
reach these. Adjust the source range to taste:

```bash
sudo ufw allow from 192.168.0.0/16 to any port 8123 proto tcp comment 'Home Assistant'
```

`8080` (Z2M frontend) and `1883` (MQTT) should be tighter still — admin
workstation only. Nothing here should ever be reachable from the internet;
use a VPN back into the house instead of port-forwarding.

## 8. Backups

- **Home Assistant:** Settings → System → Backups, scheduled.
- **Zigbee2MQTT:** `zigbee2mqtt/data/coordinator_backup.json` is the important
  one — it holds the network key and device table. Without it, replacing a
  failed dongle means re-pairing every device in the house.

Both live under this directory, so a single snapshot of `infra/homesync/`
covers the lot.

## Notes

Runtime state (databases, logs, HA config, secrets) is gitignored — only the
templates here are version-controlled.
