import { LotusRPC } from '@filecoin-shipyard/lotus-client-rpc'
import { NodejsProvider } from '@filecoin-shipyard/lotus-client-provider-nodejs'
import { mainnet } from '@filecoin-shipyard/lotus-client-schema'
import { multiaddr } from 'multiaddr'
import fetch from 'node-fetch'
import { BufferList } from 'bl'
import { encode, Token, Type } from 'cborg'
import { Duplex } from 'stream'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'

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

async function getInfoFor(miner, pid) {
    const info = await client.stateMinerInfo(miner, [])
    if (info.PeerId != null) {
        if (pid != undefined && pid != info.PeerId) {
            return
        }
        if (info.Multiaddrs.length > 0) {
            for (const addr of info.Multiaddrs) {
                const bytes = _base64ToArrayBuffer(addr)
                const ma = multiaddr(bytes)
                console.log(miner)
                console.log(ma.encapsulate('/p2p/' + info.PeerId).toString())

                try {
                    const mab = ma.encapsulate('/p2p/' + info.PeerId).bytes
                    const none = Buffer.alloc(0)
                    const advertisementCid = CID.create(1, 0x0129, await sha256.digest(none))
               const cbor = encode([advertisementCid, [mab], Buffer.alloc(0)],
               {
                typeEncoders: {
                  Object: function (cid) {
                    // CID must be prepended with 0 for historical reason - See: https://github.com/ipld/cid-cbor
                    const bytes = new BufferList(Buffer.alloc(1))
                    bytes.append(cid.bytes)
      
                    return [new Token(Type.tag, 42), new Token(Type.bytes, bytes.slice())]
                  }
                }
              })

                //const url = 'http://abcca6d4490f0426d9dd855139563762-159596440.us-east-2.elb.amazonaws.com:3001/ingest/announce';
                const url = 'http://18.116.210.184:3001/ingest/announce';
                    let stream = new Duplex();
                    stream.push(cbor);
                    stream.push(null);

                    const response = await fetch(url, {
                        method: 'PUT',
                        mode: 'same-origin',
                        headers: {
                            'Content-Type': 'application/cbor'
                        },
                        body: stream
                    })
                } catch(e) {
                    console.log(e)
                }
            }
        }
        return info
    }
    return null
}

async function run (pid) {
  try {

    const markets = await client.stateMarketParticipants([])

    for (const miner of Object.keys(markets)) {
        try {
            const mi = await getInfoFor(miner, pid)
        } catch (e) {
            continue
        }
    }
  } catch (e) {
    console.error('client.statelistminers error', e)
  }
  await client.destroy()
}

if (process.argv.length > 2) {
    run(process.argv[2])
} else {
    run()
}
