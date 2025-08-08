# Environment Setup Guide

This document provides comprehensive guidance for setting up environment variables for the Nest by Eden Oasis application.

## 🚀 Quick Start

1. Copy `.env.example` to `.env.local`
2. Fill in the required variables
3. Run the environment validation: `npm run validate-env`

## 📋 Required Environment Variables

### Supabase Configuration

```bash
# Supabase Project URL (found in your Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anonymous Key (found in your Supabase dashboard)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Email Configuration (Resend)

```bash
# Resend API Key for sending emails
RESEND_API_KEY=re_your-resend-api-key-here

# From email address for system emails
FROM_EMAIL=noreply@yourdomain.com
```

### Application Configuration

```bash
# Base URL for your application
NEXT_PUBLIC_BASE_URL=https://your-app-domain.com

# Secret for cron job authentication
CRON_SECRET=your-secure-cron-secret-here

# Google Chat Webhook URL (optional)
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/...
```

## 🔧 Optional Environment Variables

### Development Only

```bash
# Enable debug mode
NODE_ENV=development

# Enable detailed logging
DEBUG=true
```

### Production Only

```bash
# Production environment
NODE_ENV=production

# Disable debug features
DEBUG=false
```

## 🛠️ Environment Validation

The application includes a built-in environment validation system that checks:

- ✅ All required variables are present
- ✅ Variables have valid formats
- ✅ Production-specific variables are set
- ⚠️ Warns about missing optional variables

### Running Validation

```bash
# Check environment status via API
curl http://localhost:3000/api/debug/environment-status

# Or visit in browser
http://localhost:3000/api/debug/environment-status
```

## 🔍 Troubleshooting

### Common Issues

1. **Missing Supabase Variables**
   - Error: "Supabase client not configured"
   - Solution: Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Email Not Sending**
   - Error: "Failed to send email"
   - Solution: Verify `RESEND_API_KEY` and `FROM_EMAIL`

3. **Authentication Issues**
   - Error: "Invalid service role key"
   - Solution: Check `SUPABASE_SERVICE_ROLE_KEY` format

### Validation Commands

```bash
# Check environment status
npm run validate-env

# Test database connection
npm run test-db

# Test email configuration
npm run test-email
```

## 📊 Environment Status Dashboard

Access the environment status dashboard at:

```
/admin/settings/environment-status
```

This provides:

- Real-time validation status
- Missing variable warnings
- Configuration recommendations
- Security audit results

## 🔐 Security Best Practices

1. **Never commit `.env.local` to version control**
2. **Use strong, unique secrets for production**
3. **Rotate API keys regularly**
4. **Use environment-specific configurations**
5. **Validate all variables before deployment**

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All required variables are set
- [ ] Environment validation passes
- [ ] Email configuration tested
- [ ] Database connection verified
- [ ] Security audit completed
- [ ] Backup configuration in place

## 📞 Support

If you encounter issues with environment setup:

1. Check the validation dashboard
2. Review this documentation
3. Check the application logs
4. Contact the development team

---

**Last Updated:** December 2024
**Version:** 1.0.0
