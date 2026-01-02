#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';

async function exploreSdk() {
    await demos.connect('https://node2.demos.sh');
    
    console.log('demos object properties:');
    console.log(Object.getOwnPropertyNames(demos));
    
    console.log('\ndemos.transactions methods:');
    if (demos.transactions) {
        console.log(Object.getOwnPropertyNames(demos.transactions));
        console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(demos.transactions)));
    }
    
    console.log('\ndemos.tx methods:');
    if (demos.tx) {
        console.log(Object.getOwnPropertyNames(demos.tx));
        console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(demos.tx)));
    }
}

exploreSdk().catch(console.error);