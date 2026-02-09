export default async function (payload, env) {
    console.info('Google Ads event process started')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
        const res = await fetch(
            `https://googleads.googleapis.com/v14/customers/${env.GADS_CUSTOMER_ID}:uploadClickConversions`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${env.GADS_ACCESS_TOKEN}`,
                    'developer-token': env.GADS_DEVELOPER_TOKEN
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            }
        )

        if (!res.ok) {
            const text = await res.text()
            console.error('Google Ads event request error: ' + text)
            return
        }
    } catch {
        console.error('Google Ads event request failed')
        return
    } finally {
        clearTimeout(timeout)
    }

    console.info('Google Ads event processed successfully')
    return
}
