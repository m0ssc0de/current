const express = require('express')
const fs = require('fs')
const path = require('path')
const app = express()
const port = 3000

const formatNum = (n) => String(n).padStart(10, '0')

app.get('/chain/eth', (req, res) => {
    eth = {
        Name: "eth",
        Type: "ehtereum",
        Network: "mainnet"
    }
  res.send(eth)
})

const topPath = "./data"
app.get('/chain/eth/ranges', (req, res) => {
    var ranges = new Ranges(topPath)
    ranges.scan()
    res.send(ranges)
})

app.get('/chain/eth/range/:range', (req, res) => {
    var range = RangeFromStr(req.params.range)
    if (range === false) {
        res.send(range)
        return
    }
    range.available = range.checkContain(topPath)
    // range = {
    //     name: "0000000000-0000009999",
    //     status: "Ready",//Missed/Incomplete/Fetching/Ready
    //     available: true
    // }
    res.send(range)
})

app.get('/chain/eth/jobs', (req, res) => {
    jobs = {
        waiting: [
            {
                id: 1,
                type: "FetchingRange"
            },
        ]
    }
})

class Range {
    start = 0
    end = 0
    constructor(start, end) {
      this.start = start;
      this.end = end;
    }
    gap(anotherRange) {
        var gap = this.start - anotherRange.end
        if (gap == 1) {
            return []
        } else {
            return [anotherRange.end+1, this.start-1]
        }
    }
    checkContain(topPath) {
        const parentDir = formatNum(this.start)+"-"+formatNum(this.end)
        const parentPath = path.join(topPath, parentDir)
        if (!fs.existsSync(parentPath)) {
            return false
        }
        const fileNames = [
            "blocks.csv", 
            "contracts.csv", 
            "receipts.csv", 
            "token_transfers.csv", 
            "transaction_hashes.txt", 
            "contract_addresses.txt", 
            "logs.csv", 
            "token_addresses.txt", 
            "tokens.csv", 
            "transactions.csv"
        ]
        // const blockNumberOffset = [0, 5, 3, 6, -1, -1, 4, -1, 5, 3]
        fileNames.forEach(fileName => {
            var p = path.join(parentPath, fileName)
            console.log(p)
            if (!fs.existsSync(p)) {
                return false
            }
        });
    }
}
function RangeFromStr(str) {
        t = str.split('-')
        if (t.length != 2) {
            return false
        }
        return new Range(t[0], t[1])
}

class Ranges{
    first
    latest
    missed
    location
    constructor(location) {
        this.location = location
        this.first = []
        this.latest = []
        this.missed = []
    }
    scan() {
        var allRanges = fs.readdirSync(this.location)
            .filter((str)=>{return str.split('-').length==2})
            .map((str)=>{return RangeFromStr(str)})
        allRanges.sort((a, b)=>{return a.first< b.first})
        if (allRanges.length == 0) {
            return new Ranges(this.location)
        }

        this.first = allRanges[0]
        this.latest = allRanges[allRanges.length-1]
        if (!this.first.checkContain(this.location)) {
            this.missed.push(this.first)
        }
        for (let index = 1; index < allRanges.length; index++) {
            const element = allRanges[index];
            if (!element.checkContain(this.location)) {
                this.missed.push(element)
            }
            const gap = element.gap(allRanges[index-1])       
            if (gap.length != 0) {
                this.missed.push(gap)
            }
        }
        return this
    }
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})