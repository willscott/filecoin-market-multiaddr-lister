import { LotusRPC } from '@filecoin-shipyard/lotus-client-rpc'
import { NodejsProvider } from '@filecoin-shipyard/lotus-client-provider-nodejs'
import { mainnet } from '@filecoin-shipyard/lotus-client-schema'
import { multiaddr } from 'multiaddr'


const url = 'https://api.node.glif.io/rpc/v0'
const provider = new NodejsProvider(url)
const client = new LotusRPC(provider, { schema: mainnet.fullNode })

function _base64ToArrayBuffer(base64) {
    var binary_string = atob(base64);
    var len = binary_string.length;
    var bytes = Buffer.alloc(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

async function getInfoFor(miner) {
    const info = await client.stateMinerInfo(miner, [])
    if (info.PeerId != null) {
        if (info.Multiaddrs.length > 0) {
            for (const addr of info.Multiaddrs) {
                const bytes = _base64ToArrayBuffer(addr)
                const ma = multiaddr(bytes)
                console.log(ma.encapsulate('/p2p/' + info.PeerId).toString())
            }
        }
        return info
    }
    return null
}

async function run () {
  try {

    const markets = await client.stateMarketParticipants([])

    for (const miner of Object.keys(markets)) {
        try {
            const mi = await getInfoFor(miner)
        } catch (e) {
            continue
        }
    }
  } catch (e) {
    console.error('client.statelistminers error', e)
  }
  await client.destroy()
}
run()
