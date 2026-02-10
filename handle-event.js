import sendToFb from './send-to-fb.js'
import sendToGa from './send-to-ga.js'
import sendToGads from './send-to-gads.js'

function extractUtms(input) {
    const output = {
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        utm_term: null,
        utm_content: null
    }

    if (input) {
        const queryIndex = input.indexOf('?')

        if (queryIndex !== -1) {
            const parts = input.slice(queryIndex + 1).split('&')

            for (let i = 0; i < parts.length; i++) {
                const [key, value] = parts[i].split('=')

                if (key in output && value) {
                    output[key] = decodeURIComponent(value)
                }
            }
        }
    }

    return output
}

export default async function (fbEventName, gaEventName, gadsConversionLabel, eventId, eventUrl, userId, cookieFbp, cookieFbc, cookieGclid, referrer, clientIp, userAgent, env) {
    console.log({ fbEventName, gaEventName, gadsConversionLabel })

    const timestamp = Math.floor(Date.now() / 1000)

    const eventUtms = extractUtms(eventUrl)

    const tasks = []

    if (env.FB_PIXEL_ID && env.FB_ACCESS_TOKEN && fbEventName) {
        const fbPayload = {
            data: [
                {
                    event_name: fbEventName,
                    event_id: eventId,
                    event_time: timestamp,
                    action_source: 'website',
                    event_source_url: referrer,
                    user_data: {
                        fbp: cookieFbp,
                        fbc: cookieFbc,
                        client_user_agent: userAgent,
                        client_ip_address: clientIp
                    },
                    custom_data: {
                        page_referrer: referrer,
                        ...eventUtms
                    },
                }]
        }

        tasks.push(sendToFb(fbPayload, env))
    } else {
        console.warn('Facebook event skipped')
    }

    if (env.GA_MEASUREMENT_ID && env.GA_ACCESS_TOKEN && gaEventName) {
        const gaPayload = {
            client_id: userId,
            events: [
                {
                    name: gaEventName,
                    params: {
                        page_location: referrer,
                        page_referrer: referrer,
                        event_id: eventId,
                        engagement_time_msec: 1,
                        ...eventUtms
                    }
                }
            ]
        }

        tasks.push(sendToGa(gaPayload, env))
    } else {
        console.warn('Google Analytics event skipped')
    }

    if (env.GADS_CUSTOMER_ID && env.GADS_ACCESS_TOKEN && cookieGclid && gadsConversionLabel) {
        const gadsPayload = {
            conversions: [
                {
                    conversionAction: `customers/${env.GADS_CUSTOMER_ID}/conversionActions/${gadsConversionLabel}`,
                    gclid: cookieGclid,
                    conversionDateTime: new Date().toISOString().replace('T', ' ').replace('Z', '+00:00'),
                    conversionValue: 1,
                    currencyCode: 'BRL',
                    orderId: eventId
                }
            ],
            partialFailure: true
        }
        tasks.push(sendToGads(gadsPayload, env))

    } else {
        console.warn('Google Ads event skipped')
    }


    if (tasks.length > 0) await Promise.all(tasks)
}