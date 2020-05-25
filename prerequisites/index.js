'use strict';

require('make-promises-safe');
const Hapi = require('@hapi/hapi');
const Wreck = require('@hapi/wreck');

async function main() {
    const server = Hapi.server({
        port: 49940,
        debug: {
            request: '*'
        },
        routes: {
            pre: [
                {
                    assign: 'redirect',
                    async method(request, h) {
                        return h.redirect('/');
                    }
                }
            ]
        }
    });

    server.route([
        {
            method: 'GET',
            path: '/countries/{country}',
            handler(request, h) {
                // country would be a boom error in case of failure
                const { country } = request.pre;

                if (country instanceof Boom) {
                    // do something with the case the country is an error
                }

                const { currencies, flag } = request.pre

                return country;
            },
            options: {
                pre: [
                    {
                        assign: 'country',
                        failAction: 'log',
                        async method(request, h) {
                            const { payload } = await Wreck.get(`https://restcountries.eu/rest/v2/alpha/${request.params.country}`, { json: true });
                            return payload;
                        }
                    },
                    [
                        {
                            assign: 'flag',
                            async method(request, h) {
                                const { flag } = request.pre.country;
                                const { payload } = await Wreck.get(flag);
                                return payload;
                            }
                        },
                        {
                            assign: 'currencies',
                            async method(request, h) {
                                const { currencies } = request.pre.country;
                                return Promise.all(currencies.map(currency => Wreck.get(`https://restcountries.eu/rest/v2/currency/${currency.code}`, { json: true })))
                            }
                        }
                    ]
                ]
            }
        },
        {
            method: 'GET',
            path: '/prerequisite/throw',
            handler(request, h) {
                /**
                 * it will never reach here because `pre`
                 * failAction is default to `error`
                 */
                const { value } = request.pre;
                return value;
            },
            options: {
                pre: [
                    {
                        assign: 'value',
                        async method(request, h) {
                            throw new Error('value has is not available')
                        }
                    }
                ]
            }
        },
        {
            method: 'GET',
            path: '/prerequisite/handle',
            handler(request, h) {
                /**
                 * Handler is reached because `failAction` is set to `log`
                 */
                const { value } = request.pre;
                /**
                 * preResponse also has the assigned `value`
                 */
                const { value:two } = request.preResponses;

                /**
                 * they're the same :thinking:
                 */
                console.log({ value });
                console.log({ two });
                return value;
            },
            options: {
                pre: [
                    {
                        assign: 'value',
                        failAction: 'log',
                        async method(request, h) {
                            throw new Error('value has is not available')
                        }
                    }
                ]
            }
        },
        {
            method: 'GET',
            path: '/prerequisite/response',
            handler(request, h) {
                /**
                 * `pre.response` will have the object "{ "data": "ok" }"
                 * `preResponse.response` will have the actual response
                 */
                const { redirect: r } = request.pre;
                const { redirect } = request.preResponses;
                /**
                 * you can check here:
                 */
                console.log({ redirect });
                console.log({ r });

                return redirect;
            }
        }
    ]);

    await server.start();
    console.log(`server started: ${server.info.uri}`);
}

main();