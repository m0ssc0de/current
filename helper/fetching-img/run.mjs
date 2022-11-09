#!/usr/bin/env zx
// import 'zx/globals'

const endpoint = process.env['ENDPOINT'] || 'http://192.168.251.20:8545'
const batchSize= process.env['BATCH_SIZE'] || 10000
const start= Number(process.env['START'] || 0)
const final= Number(process.env['FINAL'] || 1000000)
const MAX_RETRIES = process.env['MAX_RETRIES'] || 100000;
const RETRY_DELAY_SEC = process.env['RETRY_DELAY_SEC'] || 5;

const dataDir = path.resolve(process.env['DATA_DIR'] || './data')
const statePath = path.resolve(process.env['STATE_PATH'] || './data/state.json')

const export_blocks_and_transactions = async (startBlock, endBlock) => {
    await $`ethereumetl export_blocks_and_transactions --start-block ${startBlock} --end-block ${endBlock} \
    --blocks-output blocks.csv --transactions-output transactions.csv \
    --provider-uri ${endpoint} --max-workers 10`
}

const export_receipts_and_logs = async () => {
    await $`ethereumetl extract_csv_column --input transactions.csv --column hash --output transaction_hashes.txt`
    await $`ethereumetl export_receipts_and_logs --transaction-hashes transaction_hashes.txt \
    --receipts-output receipts.csv --logs-output logs.csv \
    --provider-uri ${endpoint} --max-workers 10`
}

const extract_token_transfers = async () => {
    await $`ethereumetl extract_token_transfers --logs logs.csv --output token_transfers.csv --max-workers 10`
}

const export_contracts = async () => {
    await $`ethereumetl extract_csv_column --input receipts.csv --column contract_address --output contract_addresses.txt`
    await $`ethereumetl export_contracts --contract-addresses contract_addresses.txt \
--provider-uri ${endpoint} --output contracts.csv --max-workers 10`
}

const export_tokens = async () => {
    await $`ethereumetl filter_items -i contracts.csv -p "item['is_erc20']=='True' or item['is_erc721']=='True'" | \
ethereumetl extract_field -f address -o token_addresses.txt`
    await $`ethereumetl export_tokens --token-addresses token_addresses.txt \
 --output tokens.csv --provider-uri ${endpoint} --max-workers 10`
}

const formatNum = (n) => String(n).padStart(10, '0')


const readState = async () => {
    return fs.readJson(statePath).catch(err=> {
        return {currentBatch: [start, start+batchSize-1], step:0};
    })
}

const writeState = async (currentBatch, step) => {
    return fs.writeJson(statePath, {currentBatch, step})
}

const steps=[export_blocks_and_transactions, export_receipts_and_logs, extract_token_transfers, export_contracts, export_tokens]

const delay = (sec) => {
    return new Promise((resolve)=>{
        setTimeout(resolve, sec * 1000);
    });
}

const retry = async (fn, args, times) => {
    let tries = 0;
    while (true) {
        try{
            return fn(...args);
        } catch (err){
            tries +=1;
            if (tries <= times) {
                await delay(RETRY_DELAY_SEC);
            } else {
                throw err;
            }
        }
    }
}

await within(async () => {
    cd(dataDir)
    let {currentBatch: [start, end], step} = await readState();

    while (end<=final) {
        const startTs = new Date();
        await within(async () => {
            const dir=`${formatNum(start)}-${formatNum(end)}`
            await $`mkdir -p ${dir}`;
            cd(dir)
            for (let i=step;i<steps.length;i++){
                await writeState([start, end], i);
                await retry(steps[i],[start, end], MAX_RETRIES);
            }
        })
        start = end + 1;
        end = start + batchSize - 1
        step = 0
        const spent = (new Date() - startTs)/1000;
        console.log(`bps: ${batchSize/spent}`);
    }
    await writeState([start, end], step);
})