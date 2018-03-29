function isTransferable(instance) {
    const transferable = [ArrayBuffer];
    if (typeof MessagePort !== 'undefined') {
        transferable.push(MessagePort);
    }
    if (typeof ImageBitmap !== 'undefined') {
        transferable.push(ImageBitmap);
    }
    return transferable.some(e => instance instanceof e);
}

class WorkerProcedureCall {
    constructor(receiver, signature) {
        this.receiver = receiver;
        this.signature = signature;
        this.id = 0;
        this.resRejs = {};
        this.receiver.addEventListener('message', async event => {
            const data = event.data;
            if (data.signature !== this.signature) {
                return;
            }
            if ('result' in data) {
                this.returnHandler(data);
            }
        }, false);
    }

    call(func, args = []) {
        return new Promise((resolve, reject) => {
            this.id += 1;
            this.resRejs[this.id] = { resolve, reject };
            // TODO 引数のトップレベルだけTransferableのチェックをしている。
            const transferList = [];
            for (const e of args) {
                if (isTransferable(e)) {
                    transferList.push(e);
                } else if (ArrayBuffer.isView(e)) {
                    transferList.push(e.buffer);
                }
            }
            this.receiver.postMessage({
                signature: this.signature,
                id: this.id,
                func,
                args,
            }, transferList);
        });
    }

    returnHandler(data) {
        if (data.error) {
            this.resRejs[data.id].reject(data.error);
        } else {
            if (data.transferList) {
                this.resRejs[data.id].resolve(data.result.concat(data.transferList));
            } else {
                this.resRejs[data.id].resolve(data.result);
            }
        }
        delete this.resRejs[data.id];
    }
}

function addProcedureListener(target, thisArg) {
    target.addEventListener('message', async function(event) {
        const data = event.data;
        if (data.signature !== thisArg.constructor.name) {
            return;
        }
        let result = await thisArg[data.func].apply(thisArg, data.args);
        const transferList = [];
        if (result instanceof Array) {
            for (const e of result) {
                if (isTransferable(e)) {
                    transferList.push(e);
                } else if (ArrayBuffer.isView(e)) {
                    transferList.push(e.buffer);
                }
            }
        }
        target.postMessage({
            signature: data.signature,
            id: data.id,
            func: data.func,
            result: result,
        }, transferList);
    }, false);
}