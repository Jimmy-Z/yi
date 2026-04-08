
import { exit } from "node:process";

const DEFAULT_ADDR = "192.168.42.1";
const DEFAULT_PORT = 7878;

const MSG_TOKEN = 257;
const MSG_START_LIVE = 259;

type Msg = {
	msg_id: number,
	rval: number|undefined,
	param: number|undefined,
}

const CONN = await Deno.connect({
	hostname: DEFAULT_ADDR,
	port: DEFAULT_PORT,
	transport: "tcp"
});

CONN.setNoDelay(true);
CONN.setKeepAlive(true);

const ENC = new TextEncoder();
const DEC = new TextDecoder();

async function snd(msg: object){
	const txt = JSON.stringify(msg);
	console.debug(`tx: ->${txt}<-, ${txt.length} bytes`);
	await CONN.write(ENC.encode(txt));
}

const RCV_BUF = new Uint8Array(1536);
async function rcv(): Promise<Msg> {
	const len = await CONN.read(RCV_BUF);
	if (len === null) {
		console.error("rcv failed");
		exit();
	}
	const txt = DEC.decode(RCV_BUF.slice(0, len));
	console.debug(`rx: ->${txt}<-, ${txt.length} bytes`);
	return JSON.parse(txt);
}

await snd({msg_id: MSG_TOKEN, token: 0});
let TOKEN = 0;
while (true) {
	const msg = await rcv();
	if (msg.msg_id === MSG_TOKEN 
		&& msg.rval === 0
		&& msg.param !== undefined) {
		TOKEN = msg.param;
		break;
	}
}
await snd({msg_id: MSG_START_LIVE, token: TOKEN, param: "none_force"});
while(true) {
	await rcv();
}
