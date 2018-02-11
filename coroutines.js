"use strict";

//asyncawait wrapper

var lasync = require('asyncawait/async');
var lawait = require('asyncawait/await');

module.exprorts = (() => {
    const self = this;

    this.func = (foo) => {
        return lasync((...params) => {
            return new Promise ((resolve, reject) => {
                foo(resolve, reject, ...params);
            });
        });
    };

    this.wrap = (foo) => {
        return lasync(() => {
            foo();
        });
    };

    this.bootstrap = (foo) => {
        self.wrap(foo)();
    };

    this.w = this.await = (foo) => {
        return lawait(foo);
    };

    this.waitCallback = (foo) => {
        return this.w(this.func(foo)());
    }
})();