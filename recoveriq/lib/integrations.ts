// Registry of integrations configurable on Settings -> Integrations
// (Superadmin only). Mirrors the credentials table in docs/ROADMAP.md.
export interface IntegrationField {
  key: string
  label: string
}

export interface IntegrationDef {
  key: string
  label: string
  fields: IntegrationField[]
}

export const INTEGRATIONS: IntegrationDef[] = [
  {
    key: 'whatsapp',
    label: 'WhatsApp Business API',
    fields: [
      { key: 'accessToken', label: 'Access token' },
      { key: 'phoneNumberId', label: 'Phone number ID' },
      { key: 'appSecret', label: 'App secret' },
      { key: 'webhookVerifyToken', label: 'Webhook verify token' },
    ],
  },
  {
    key: 'sms',
    label: 'SMS Gateway',
    fields: [
      { key: 'apiKey', label: 'API key/secret' },
      { key: 'senderId', label: 'Sender ID' },
      { key: 'baseUrl', label: 'Base URL' },
    ],
  },
  {
    key: 'smtp',
    label: 'Email (SMTP)',
    fields: [
      { key: 'host', label: 'Host' },
      { key: 'port', label: 'Port' },
      { key: 'username', label: 'Username' },
      { key: 'password', label: 'Password' },
      { key: 'fromAddress', label: 'From address' },
    ],
  },
  {
    key: 'push',
    label: 'Mobile Push',
    fields: [{ key: 'serverKey', label: 'FCM/APNs server key' }],
  },
  {
    key: 'voice',
    label: 'Voice Calls',
    fields: [
      { key: 'apiKey', label: 'Provider API key/secret' },
      { key: 'callerId', label: 'Caller ID' },
    ],
  },
  {
    key: 'mpesa',
    label: 'M-Pesa (Daraja)',
    fields: [
      { key: 'consumerKey', label: 'Consumer key' },
      { key: 'consumerSecret', label: 'Consumer secret' },
      { key: 'shortcode', label: 'Shortcode' },
      { key: 'passkey', label: 'Passkey' },
      { key: 'callbackUrl', label: 'Callback URL' },
    ],
  },
  {
    key: 'airtel-money',
    label: 'Airtel Money',
    fields: [
      { key: 'clientId', label: 'Client ID' },
      { key: 'clientSecret', label: 'Client secret' },
      { key: 'callbackUrl', label: 'Callback URL' },
    ],
  },
  {
    key: 'banks',
    label: 'Bank integrations',
    fields: [{ key: 'credentials', label: 'Per-bank API credentials / SFTP details' }],
  },
  {
    key: 'card-gateway',
    label: 'Card / Online Gateway',
    fields: [
      { key: 'publicKey', label: 'Public key' },
      { key: 'secretKey', label: 'Secret key' },
      { key: 'webhookSecret', label: 'Webhook secret' },
    ],
  },
  {
    key: 'maps',
    label: 'Maps / GPS / Routing',
    fields: [{ key: 'apiKey', label: 'Maps API key' }],
  },
  {
    key: 'ai-predictive',
    label: 'AI / Predictive service',
    fields: [
      { key: 'apiKey', label: 'Model API key' },
      { key: 'endpoint', label: 'Endpoint' },
    ],
  },
  {
    key: 'credit-score',
    label: 'Credit score provider',
    fields: [{ key: 'apiKey', label: 'API key / credentials' }],
  },
  {
    key: 'crm',
    label: 'CRM',
    fields: [
      { key: 'baseUrl', label: 'Base URL' },
      { key: 'apiKey', label: 'API key/OAuth credentials' },
    ],
  },
  {
    key: 'erp',
    label: 'ERP',
    fields: [
      { key: 'baseUrl', label: 'Base URL' },
      { key: 'apiKey', label: 'API key/OAuth credentials' },
    ],
  },
  {
    key: 'dynamics-nav',
    label: 'Microsoft Dynamics NAV',
    fields: [
      { key: 'tenant', label: 'Tenant' },
      { key: 'clientId', label: 'Client ID' },
      { key: 'clientSecret', label: 'Client secret' },
      { key: 'environment', label: 'Environment' },
    ],
  },
  {
    key: 'business-central',
    label: 'Business Central',
    fields: [
      { key: 'tenant', label: 'Tenant' },
      { key: 'clientId', label: 'Client ID' },
      { key: 'clientSecret', label: 'Client secret' },
      { key: 'environment', label: 'Environment' },
    ],
  },
]
