# Public database CA fixture

`supabase-root-ca.crt` is Supabase's publicly distributed production root certificate, downloaded from the certificate location linked by the Supabase Dashboard. It contains no private key, password, project credential or user data.

Source: `https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`.

This fixture qualifies parsing and TLS configuration. A hosted database connection separately verifies the actual server certificate and hostname. Production supplies the current root through the server-only `OALO_DATABASE_CA_CERT_PEM` setting; this fixture is not silently selected as a runtime default.
