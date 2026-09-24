import * as fs from "fs";
import * as path from "path";

/**
 * Generate accurate OpenAPI 3.0 specification from orchestrator controllers, DTOs, and architecture.
 *
 * Sources reviewed & cited:
 * - AuthController: src/auth/auth.controller.ts (CreateApiKeyDto, CreateTokenDto)
 * - UsersController: src/users/users.controller.ts (CreateUserDto, UpdateUserDto, LinkAirtmAccountDto)
 * - BalanceController: src/balance/balance.controller.ts (ReserveBalanceDto, ReleaseBalanceDto, CreditBalanceDto, DebitBalanceDto)
 * - OrdersController: src/orders/orders.controller.ts (CreateOrderDto, ReserveOrderDto, CancelOrderDto, CreateOrderEscrowDto, ReleaseOrderDto, RefundOrderDto, OpenOrderDisputeDto)
 * - EscrowController: src/escrow/escrow.controller.ts (CreateEscrowDto)
 * - ResolutionController: src/resolution/resolution.controller.ts (ResolutionReleaseDto, ResolutionRefundDto, ResolutionResolveDto)
 * - TopUpsController: src/topups/topups.controller.ts (CreateTopUpDto)
 * - WithdrawalsController: src/withdrawals/withdrawals.controller.ts (CreateWithdrawalDto)
 * - DisputesController: src/disputes/disputes.controller.ts (CreateDisputeDto, AssignDisputeDto, ResolveDisputeDto, AddDisputeCommentDto)
 * - EventsController: src/events/events.controller.ts
 * - WalletController: src/wallet/wallet.controller.ts
 * - AuditController: src/audit/audit.controller.ts
 * - WebhooksController: src/webhooks/webhooks.controller.ts
 * - HealthController: src/health/health.controller.ts
 * - SystemController: src/system/system.controller.ts (MaintenanceModeDto)
 */

export const openApiSpec: Record<string, any> = {
  openapi: "3.0.3",
  info: {
    title: "OFFER-HUB Orchestrator API",
    version: "1.0.0",
    description:
      "Official OpenAPI 3.0 specification for the OFFER-HUB Orchestrator — self-hosted payments middleware for marketplaces integrating non-custodial Soroban smart contracts on Stellar and multi-rail settlement (crypto-native Stellar USDC and AirTM fiat). All responses follow the standard `ApiResponse<T>` contract format.",
    contact: {
      name: "OFFER-HUB Team",
      url: "https://github.com/OFFER-HUB/offer-hub-monorepo",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:4000/api/v1",
      description: "Local Development Server",
    },
    {
      url: "https://api.offerhub.io/api/v1",
      description: "Production / Staging Server (Instance Configurable)",
    },
  ],
  tags: [
    { name: "Auth", description: "API key management, token generation, and scope validation (AuthController)" },
    { name: "Users", description: "User registration, identity management, and wallet linking (UsersController)" },
    { name: "Balance", description: "Per-user ledger tracking, sync, reservations, and admin ledger adjustments (BalanceController)" },
    { name: "Orders", description: "End-to-end commercial order lifecycle, state machine, and escrow bridge (OrdersController)" },
    { name: "Escrow", description: "Trustless Work Soroban smart contract lifecycle and funding (EscrowController)" },
    { name: "Resolution", description: "Multi-signature escrow release, refund, and split dispute execution (ResolutionController)" },
    { name: "TopUps", description: "Fiat deposit on-ramp via AirTM redirect integration (TopUpsController)" },
    { name: "Withdrawals", description: "Synchronous Stellar USDC payments and AirTM fiat payouts (WithdrawalsController)" },
    { name: "Disputes", description: "Arbitration dispute cases, evidence threads, and resolution decisions (DisputesController)" },
    { name: "Events", description: "Real-time Server-Sent Events (SSE) and historical event streaming (EventsController)" },
    { name: "Wallet", description: "Server-side invisible Stellar keypairs and USDC deposit addresses (WalletController)" },
    { name: "Audit", description: "Immutable audit log query and state diff inspection (AuditController)" },
    { name: "Webhooks", description: "Incoming webhook ingress for AirTM and Trustless Work notifications (WebhooksController)" },
    { name: "System & Health", description: "System health probes, runtime configuration, and maintenance mode (HealthController & SystemController)" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API Key (ohk_live_...)",
        description: "Bearer API token with read, write, or support scopes",
      },
      MasterKeyAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Master Key",
        description: "Master administrator key for API key management and system settings",
      },
      AirtmHmacAuth: {
        type: "apiKey",
        in: "header",
        name: "x-airtm-signature",
        description: "HMAC signature header for AirTM webhook verification",
      },
      TrustlessWorkHmacAuth: {
        type: "apiKey",
        in: "header",
        name: "x-trustlesswork-signature",
        description: "HMAC signature header for Trustless Work webhook verification",
      },
    },
    schemas: {
      ApiResponse: {
        type: "object",
        required: ["ok", "code", "type", "title", "message"],
        properties: {
          ok: { type: "boolean", description: "Boolean success status indicator" },
          code: { type: "integer", example: 1000, description: "Semantic application status code" },
          type: { type: "string", enum: ["success", "error", "warning"], example: "success" },
          title: { type: "string", example: "Success", description: "Short headline for UI toasts or alerts" },
          message: { type: "string", example: "Operation completed successfully", description: "Human-readable description" },
          data: { type: "object", nullable: true, description: "Payload object if successful" },
          errors: {
            type: "array",
            nullable: true,
            items: { $ref: "#/components/schemas/ValidationError" },
            description: "Field-level validation error details",
          },
        },
      },
      ValidationError: {
        type: "object",
        required: ["field", "message"],
        properties: {
          field: { type: "string", example: "amount" },
          message: { type: "string", example: "Amount must be a positive decimal string formatted to 2 places" },
        },
      },
      ApiKey: {
        type: "object",
        properties: {
          id: { type: "string", example: "key_01HQ7Z..." },
          name: { type: "string", example: "Marketplace Production Server" },
          keyPrefix: { type: "string", example: "ohk_live_abc..." },
          scopes: { type: "array", items: { type: "string", enum: ["read", "write", "support", "*"] } },
          createdAt: { type: "string", format: "date-time" },
          revokedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      CreateApiKeyDto: {
        type: "object",
        required: ["name", "scopes"],
        properties: {
          name: { type: "string", example: "Marketplace Backend" },
          scopes: {
            type: "array",
            items: { type: "string", enum: ["read", "write", "support", "*"] },
            example: ["read", "write"],
          },
        },
      },
      CreateTokenDto: {
        type: "object",
        required: ["userId"],
        properties: {
          userId: { type: "string", example: "usr_01HQ7..." },
          expiresIn: { type: "integer", example: 3600, description: "Token validity duration in seconds (default: 3600)" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "usr_01HQ7..." },
          email: { type: "string", example: "buyer@example.com" },
          type: { type: "string", enum: ["BUYER", "SELLER", "BOTH"], example: "BUYER" },
          walletAddress: { type: "string", example: "GBXF4A7CKUVNLXYZ1234..." },
          airtmUserId: { type: "string", nullable: true },
          metadata: { type: "object", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateUserDto: {
        type: "object",
        properties: {
          id: { type: "string", description: "Optional custom user ID prefix usr_", example: "usr_buyer123" },
          email: { type: "string", format: "email", example: "user@marketplace.com" },
          type: { type: "string", enum: ["BUYER", "SELLER", "BOTH"], default: "BOTH" },
          metadata: { type: "object", example: { username: "crypto_trader" } },
        },
      },
      UpdateUserDto: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          metadata: { type: "object" },
        },
      },
      LinkAirtmAccountDto: {
        type: "object",
        required: ["airtmUserId"],
        properties: {
          airtmUserId: { type: "string", example: "airtm_usr_9921" },
          airtmEmail: { type: "string", format: "email", example: "user@airtm.com" },
        },
      },
      Balance: {
        type: "object",
        properties: {
          userId: { type: "string", example: "usr_01HQ7..." },
          available: { type: "string", example: "1250.00", description: "Available spendable balance" },
          reserved: { type: "string", example: "200.00", description: "Held in pre-escrow reservation" },
          total: { type: "string", example: "1450.00" },
          currency: { type: "string", example: "USD" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ReserveBalanceDto: {
        type: "object",
        required: ["amount"],
        properties: {
          amount: { type: "string", example: "80.00" },
          orderId: { type: "string", example: "ord_VxaM..." },
          currency: { type: "string", default: "USD" },
        },
      },
      ReleaseBalanceDto: {
        type: "object",
        required: ["amount"],
        properties: {
          amount: { type: "string", example: "80.00" },
          orderId: { type: "string", example: "ord_VxaM..." },
        },
      },
      CreditBalanceDto: {
        type: "object",
        required: ["amount", "currency"],
        properties: {
          amount: { type: "string", example: "100.00" },
          currency: { type: "string", example: "USD" },
          reason: { type: "string", example: "Manual adjustment by support" },
          referenceId: { type: "string", example: "adj_01HQ7..." },
        },
      },
      DebitBalanceDto: {
        type: "object",
        required: ["amount", "currency"],
        properties: {
          amount: { type: "string", example: "50.00" },
          currency: { type: "string", example: "USD" },
          reason: { type: "string", example: "Reversal of erroneous credit" },
          referenceId: { type: "string", example: "adj_01HQ8..." },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string", example: "ord_VxaM..." },
          status: {
            type: "string",
            enum: [
              "ORDER_CREATED",
              "FUNDS_RESERVED",
              "ESCROW_CREATING",
              "ESCROW_FUNDING",
              "ESCROW_FUNDED",
              "IN_PROGRESS",
              "RELEASE_REQUESTED",
              "RELEASED",
              "REFUND_REQUESTED",
              "REFUNDED",
              "DISPUTED",
              "CLOSED",
            ],
            example: "ORDER_CREATED",
          },
          buyerId: { type: "string", example: "usr_buyer123" },
          sellerId: { type: "string", example: "usr_seller456" },
          amount: { type: "string", example: "80.00" },
          currency: { type: "string", example: "USD" },
          title: { type: "string", example: "Logo design" },
          description: { type: "string", example: "Design a logo for startup" },
          clientOrderRef: { type: "string", example: "mkt_order_9981" },
          escrowId: { type: "string", nullable: true, example: "esc_abc123" },
          disputeId: { type: "string", nullable: true },
          finalStatus: { type: "string", enum: ["RELEASED", "REFUNDED", "CANCELED"], nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateOrderDto: {
        type: "object",
        required: ["buyerId", "sellerId", "amount"],
        properties: {
          buyerId: { type: "string", example: "usr_buyer123" },
          sellerId: { type: "string", example: "usr_seller456" },
          amount: { type: "string", example: "80.00" },
          currency: { type: "string", default: "USD", example: "USD" },
          title: { type: "string", example: "Logo design" },
          description: { type: "string", example: "Design a logo for startup" },
          clientOrderRef: { type: "string", example: "mkt_order_9981" },
          milestones: {
            type: "array",
            items: {
              type: "object",
              required: ["title", "amount"],
              properties: {
                title: { type: "string", example: "Initial Sketch" },
                amount: { type: "string", example: "40.00" },
                description: { type: "string", example: "First draft submission" },
              },
            },
          },
        },
      },
      ReserveOrderDto: {
        type: "object",
        properties: {
          amount: { type: "string", example: "80.00", description: "Defaults to order full amount" },
        },
      },
      CancelOrderDto: {
        type: "object",
        required: ["canceledBy"],
        properties: {
          canceledBy: { type: "string", enum: ["BUYER", "SELLER"], example: "BUYER" },
          reason: { type: "string", example: "Changed my mind before escrow was funded" },
        },
      },
      CreateOrderEscrowDto: {
        type: "object",
        properties: {
          amount: { type: "string", example: "80.00" },
          currency: { type: "string", default: "USD" },
        },
      },
      ReleaseOrderDto: {
        type: "object",
        properties: {
          requestedBy: { type: "string", enum: ["BUYER", "PLATFORM"], default: "BUYER" },
          milestoneId: { type: "string", nullable: true },
        },
      },
      RefundOrderDto: {
        type: "object",
        properties: {
          requestedBy: { type: "string", enum: ["BUYER", "PLATFORM"], default: "BUYER" },
          reason: { type: "string", example: "Seller failed to deliver on time" },
        },
      },
      OpenOrderDisputeDto: {
        type: "object",
        required: ["openedBy", "reason"],
        properties: {
          openedBy: { type: "string", enum: ["BUYER", "SELLER"], example: "BUYER" },
          reason: { type: "string", enum: ["NOT_DELIVERED", "QUALITY_ISSUE", "OTHER"], example: "QUALITY_ISSUE" },
          notes: { type: "string", example: "Deliverable did not meet specification" },
        },
      },
      Escrow: {
        type: "object",
        properties: {
          id: { type: "string", example: "esc_01HQ7..." },
          orderId: { type: "string", example: "ord_VxaM..." },
          trustlessContractId: { type: "string", example: "CBX249SDF..." },
          status: {
            type: "string",
            enum: ["CREATING", "CREATED", "FUNDING", "FUNDED", "RELEASING", "RELEASED", "REFUNDING", "REFUNDED", "DISPUTED"],
            example: "FUNDED",
          },
          buyerAddress: { type: "string", example: "GBXF..." },
          sellerAddress: { type: "string", example: "GSELLER..." },
          platformAddress: { type: "string", example: "GPLATFORM..." },
          amount: { type: "string", example: "80.00" },
          currency: { type: "string", example: "USDC" },
          createdAt: { type: "string", format: "date-time" },
          fundedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      CreateEscrowDto: {
        type: "object",
        required: ["orderId", "buyerId", "sellerId", "amount"],
        properties: {
          orderId: { type: "string", example: "ord_VxaM..." },
          buyerId: { type: "string", example: "usr_buyer123" },
          sellerId: { type: "string", example: "usr_seller456" },
          amount: { type: "string", example: "80.00" },
          currency: { type: "string", default: "USD" },
          trustlessContractId: { type: "string" },
        },
      },
      ResolutionReleaseDto: {
        type: "object",
        required: ["escrowId"],
        properties: {
          escrowId: { type: "string", example: "esc_abc123" },
          orderId: { type: "string", example: "ord_VxaM..." },
          milestoneId: { type: "string" },
        },
      },
      ResolutionRefundDto: {
        type: "object",
        required: ["escrowId"],
        properties: {
          escrowId: { type: "string", example: "esc_abc123" },
          orderId: { type: "string", example: "ord_VxaM..." },
          reason: { type: "string", example: "Buyer requested full refund" },
        },
      },
      ResolutionResolveDto: {
        type: "object",
        required: ["disputeId", "decision"],
        properties: {
          disputeId: { type: "string", example: "dsp_abc123" },
          decision: { type: "string", enum: ["FULL_RELEASE", "FULL_REFUND", "SPLIT"], example: "SPLIT" },
          releaseAmount: { type: "string", example: "60.00", description: "Required if decision is SPLIT (seller portion)" },
          refundAmount: { type: "string", example: "20.00", description: "Required if decision is SPLIT (buyer portion)" },
          note: { type: "string", example: "Arbitrated resolution note" },
        },
      },
      ResolutionResult: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          status: { type: "string", example: "RESOLVED" },
          decision: { type: "string", enum: ["FULL_RELEASE", "FULL_REFUND", "SPLIT"], nullable: true },
          transactions: { type: "array", items: { type: "string" }, description: "Stellar Horizon transaction hashes executed" },
          distributions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                address: { type: "string" },
                amount: { type: "string" },
              },
            },
          },
        },
      },
      TopUp: {
        type: "object",
        properties: {
          id: { type: "string", example: "tp_xyz789" },
          status: {
            type: "string",
            enum: ["TOPUP_CREATED", "TOPUP_AWAITING_USER_CONFIRMATION", "TOPUP_PROCESSING", "TOPUP_SUCCEEDED", "TOPUP_FAILED", "TOPUP_CANCELED"],
            example: "TOPUP_AWAITING_USER_CONFIRMATION",
          },
          userId: { type: "string", example: "usr_abc123" },
          amount: { type: "string", example: "100.00" },
          currency: { type: "string", example: "USD" },
          confirmationUri: { type: "string", example: "https://app.airtm.com/p/confirm/xxx" },
          airtmPayinId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateTopUpDto: {
        type: "object",
        required: ["userId", "amount"],
        properties: {
          userId: { type: "string", example: "usr_abc123" },
          amount: { type: "string", example: "100.00" },
          currency: { type: "string", default: "USD" },
          redirectUrl: { type: "string", format: "uri", example: "https://marketplace.com/wallet/success" },
        },
      },
      Withdrawal: {
        type: "object",
        properties: {
          id: { type: "string", example: "wd_xyz789" },
          userId: { type: "string", example: "usr_abc123" },
          amount: { type: "string", example: "50.00" },
          currency: { type: "string", example: "USD" },
          destinationType: { type: "string", enum: ["stellar", "airtm"], example: "stellar" },
          destination: { type: "string", example: "GBXF...RECIPIENT..." },
          status: {
            type: "string",
            enum: ["WITHDRAWAL_CREATED", "WITHDRAWAL_PROCESSING", "WITHDRAWAL_COMPLETED", "WITHDRAWAL_FAILED", "WITHDRAWAL_CANCELED"],
            example: "WITHDRAWAL_COMPLETED",
          },
          transactionHash: { type: "string", nullable: true, example: "abc123...stellar...tx..." },
          airtmPayoutId: { type: "string", nullable: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CreateWithdrawalDto: {
        type: "object",
        required: ["userId", "amount", "destinationType", "destination"],
        properties: {
          userId: { type: "string", example: "usr_abc123" },
          amount: { type: "string", example: "50.00" },
          currency: { type: "string", default: "USD" },
          destinationType: { type: "string", enum: ["stellar", "airtm"], example: "stellar" },
          destination: { type: "string", example: "GBXF...RECIPIENT...STELLAR...ADDRESS" },
        },
      },
      Dispute: {
        type: "object",
        properties: {
          id: { type: "string", example: "dsp_abc123" },
          orderId: { type: "string", example: "ord_VxaM..." },
          status: { type: "string", enum: ["OPEN", "UNDER_REVIEW", "RESOLVED"], example: "OPEN" },
          openedBy: { type: "string", enum: ["BUYER", "SELLER"], example: "BUYER" },
          reason: { type: "string", enum: ["NOT_DELIVERED", "QUALITY_ISSUE", "OTHER"], example: "QUALITY_ISSUE" },
          assignedTo: { type: "string", nullable: true, example: "agent_support01" },
          notes: { type: "string", nullable: true },
          decision: { type: "string", enum: ["FULL_RELEASE", "FULL_REFUND", "SPLIT"], nullable: true },
          releaseAmount: { type: "string", nullable: true },
          refundAmount: { type: "string", nullable: true },
          resolvedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CreateDisputeDto: {
        type: "object",
        required: ["orderId", "openedBy", "reason"],
        properties: {
          orderId: { type: "string", example: "ord_VxaM..." },
          openedBy: { type: "string", enum: ["BUYER", "SELLER"], example: "BUYER" },
          reason: { type: "string", enum: ["NOT_DELIVERED", "QUALITY_ISSUE", "OTHER"], example: "NOT_DELIVERED" },
          notes: { type: "string", example: "Seller failed to deliver by deadline" },
        },
      },
      AssignDisputeDto: {
        type: "object",
        required: ["agentId"],
        properties: {
          agentId: { type: "string", example: "agent_support01" },
          notes: { type: "string", example: "Assigned for review of work submission" },
        },
      },
      ResolveDisputeDto: {
        type: "object",
        required: ["decision"],
        properties: {
          decision: { type: "string", enum: ["FULL_RELEASE", "FULL_REFUND", "SPLIT"], example: "SPLIT" },
          releaseAmount: { type: "string", example: "60.00", description: "Required if SPLIT" },
          refundAmount: { type: "string", example: "20.00", description: "Required if SPLIT" },
          note: { type: "string", example: "Settlement decided based on submitted deliverables" },
        },
      },
      DisputeComment: {
        type: "object",
        properties: {
          id: { type: "string", example: "cm_01HQ7..." },
          disputeId: { type: "string", example: "dsp_abc123" },
          authorId: { type: "string", example: "usr_buyer123" },
          authorRole: { type: "string", enum: ["BUYER", "SELLER", "SUPPORT"], example: "BUYER" },
          message: { type: "string", example: "Attached screenshot of communication" },
          attachments: { type: "array", items: { type: "string" } },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AddDisputeCommentDto: {
        type: "object",
        required: ["authorId", "authorRole", "message"],
        properties: {
          authorId: { type: "string", example: "usr_buyer123" },
          authorRole: { type: "string", enum: ["BUYER", "SELLER", "SUPPORT"], example: "BUYER" },
          message: { type: "string", example: "Here is the deliverable file link." },
          attachments: { type: "array", items: { type: "string" } },
        },
      },
      DomainEvent: {
        type: "object",
        properties: {
          eventId: { type: "string", example: "evt_n_8yumeOFwqPnSbhvemqJ" },
          eventType: { type: "string", example: "order.escrow_funded" },
          occurredAt: { type: "string", format: "date-time" },
          aggregateId: { type: "string", example: "ord_VxaM..." },
          aggregateType: { type: "string", example: "Order" },
          payload: { type: "object" },
          metadata: {
            type: "object",
            properties: {
              correlationId: { type: "string" },
              causationId: { type: "string" },
              userId: { type: "string" },
            },
          },
        },
      },
      DepositAddress: {
        type: "object",
        properties: {
          address: { type: "string", example: "GBXF4A7CKUVNLXYZ1234..." },
          network: { type: "string", example: "stellar" },
          asset: { type: "string", example: "USDC" },
          memo: { type: "string", nullable: true, example: null },
          instructions: { type: "string", example: "Send USDC (Stellar) to this address. Deposits credited automatically within 30s." },
        },
      },
      Wallet: {
        type: "object",
        properties: {
          userId: { type: "string", example: "usr_buyer123" },
          publicKey: { type: "string", example: "GBXF4A7CKUVNLXYZ1234..." },
          network: { type: "string", example: "testnet" },
          trustlineActive: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "string", example: "aud_01HQ7..." },
          action: { type: "string", example: "order.create" },
          actorId: { type: "string", example: "usr_buyer123" },
          resourceType: { type: "string", example: "Order" },
          resourceId: { type: "string", example: "ord_VxaM..." },
          result: { type: "string", enum: ["SUCCESS", "FAILURE"], example: "SUCCESS" },
          beforeState: { type: "object", nullable: true },
          afterState: { type: "object", nullable: true },
          correlationId: { type: "string", example: "req_01HQ7..." },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      HealthStatus: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          timestamp: { type: "string", format: "date-time" },
          version: { type: "string", example: "1.0.0" },
          uptime: { type: "number", example: 12450.5 },
          database: { type: "string", example: "connected" },
          redis: { type: "string", example: "connected" },
          horizon: { type: "string", example: "connected" },
        },
      },
      SystemInfo: {
        type: "object",
        properties: {
          environment: { type: "string", example: "production" },
          paymentProvider: { type: "string", enum: ["crypto", "airtm"], example: "crypto" },
          stellarNetwork: { type: "string", enum: ["testnet", "mainnet"], example: "testnet" },
          version: { type: "string", example: "1.0.0" },
          blockchainMonitorActive: { type: "boolean", example: true },
          maintenanceMode: { type: "boolean", example: false },
        },
      },
      MaintenanceModeDto: {
        type: "object",
        required: ["enabled"],
        properties: {
          enabled: { type: "boolean", example: true },
          message: { type: "string", example: "System undergoing scheduled database maintenance." },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          total: { type: "integer", example: 42 },
          page: { type: "integer", example: 1 },
          perPage: { type: "integer", example: 20 },
          totalPages: { type: "integer", example: 3 },
          hasNextPage: { type: "boolean", example: true },
          hasPreviousPage: { type: "boolean", example: false },
          nextCursor: { type: "string", nullable: true, example: "ord_xyz789" },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: "Authentication failed or token missing",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiResponse" },
            example: {
              ok: false,
              code: 4003,
              type: "error",
              title: "Unauthorized",
              message: "Missing or invalid API key",
              data: null,
            },
          },
        },
      },
      ForbiddenError: {
        description: "API key lacks required scope",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiResponse" },
            example: {
              ok: false,
              code: 4003,
              type: "error",
              title: "Forbidden",
              message: "API key lacks required scope: write",
              data: null,
            },
          },
        },
      },
      NotFoundError: {
        description: "Requested resource was not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiResponse" },
            example: {
              ok: false,
              code: 4004,
              type: "error",
              title: "Not Found",
              message: "Resource not found",
              data: null,
            },
          },
        },
      },
      ValidationError: {
        description: "Input payload validation failed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiResponse" },
            example: {
              ok: false,
              code: 4001,
              type: "error",
              title: "Validation Error",
              message: "Invalid request payload fields",
              data: null,
              errors: [{ field: "amount", message: "Amount must be a positive decimal string" }],
            },
          },
        },
      },
      ConflictError: {
        description: "State transition invalid or idempotency key collision",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiResponse" },
            example: {
              ok: false,
              code: 4009,
              type: "error",
              title: "Conflict",
              message: "Invalid state transition for current resource status",
              data: null,
            },
          },
        },
      },
    },
  },
  paths: {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. AUTH MODULE (AuthController - src/auth/auth.controller.ts)
    // ─────────────────────────────────────────────────────────────────────────
    "/auth/api-keys": {
      post: {
        tags: ["Auth"],
        summary: "Create API Key",
        description: "Generates a new API key with configured permissions. Requires Master Key authentication.\n\n**Source:** `AuthController.createApiKey` in `src/auth/auth.controller.ts` (DTO: `CreateApiKeyDto`)",
        operationId: "createApiKey",
        security: [{ MasterKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateApiKeyDto" },
            },
          },
        },
        responses: {
          "201": {
            description: "API Key created successfully. The full key secret is returned only once.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
        "x-controller": "AuthController",
        "x-dto": "CreateApiKeyDto",
        "x-source-file": "src/auth/auth.controller.ts",
      },
      get: {
        tags: ["Auth"],
        summary: "List API Keys",
        description: "Lists all active and revoked API keys with masked secrets. Requires Master Key.\n\n**Source:** `AuthController.listApiKeys` in `src/auth/auth.controller.ts`",
        operationId: "listApiKeys",
        security: [{ MasterKeyAuth: [] }],
        responses: {
          "200": {
            description: "List of API keys",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
        },
        "x-controller": "AuthController",
        "x-source-file": "src/auth/auth.controller.ts",
      },
    },
    "/auth/api-keys/{id}": {
      get: {
        tags: ["Auth"],
        summary: "Get API Key Details",
        description: "Retrieves metadata for a specific API key.\n\n**Source:** `AuthController.getApiKey` in `src/auth/auth.controller.ts`",
        operationId: "getApiKey",
        security: [{ MasterKeyAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "API Key ID" },
        ],
        responses: {
          "200": { description: "API Key details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "404": { $ref: "#/components/responses/NotFoundError" },
        },
        "x-controller": "AuthController",
        "x-source-file": "src/auth/auth.controller.ts",
      },
      delete: {
        tags: ["Auth"],
        summary: "Revoke API Key",
        description: "Immediately revokes an API key. Revoked keys can no longer authenticate.\n\n**Source:** `AuthController.revokeApiKey` in `src/auth/auth.controller.ts`",
        operationId: "revokeApiKey",
        security: [{ MasterKeyAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "API Key ID" },
        ],
        responses: {
          "200": { description: "API key revoked successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "404": { $ref: "#/components/responses/NotFoundError" },
        },
        "x-controller": "AuthController",
        "x-source-file": "src/auth/auth.controller.ts",
      },
    },
    "/auth/tokens": {
      post: {
        tags: ["Auth"],
        summary: "Create Frontend Client Token",
        description: "Creates a short-lived token (`ohk_tok_...`) scoped for frontend client operations.\n\n**Source:** `AuthController.createToken` in `src/auth/auth.controller.ts` (DTO: `CreateTokenDto`)",
        operationId: "createClientToken",
        security: [{ BearerAuth: ["write"] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateTokenDto" } } },
        },
        responses: {
          "201": { description: "Short-lived token generated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
        "x-controller": "AuthController",
        "x-dto": "CreateTokenDto",
        "x-source-file": "src/auth/auth.controller.ts",
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get Authenticated Key Info",
        description: "Returns caller identity, name, and authorized scopes for the current Bearer token.\n\n**Source:** `AuthController.getCallerInfo` in `src/auth/auth.controller.ts`",
        operationId: "getCallerInfo",
        security: [{ BearerAuth: ["read"] }],
        responses: {
          "200": { description: "Token identity and scopes", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
        },
        "x-controller": "AuthController",
        "x-source-file": "src/auth/auth.controller.ts",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 2. USERS MODULE (UsersController - src/users/users.controller.ts)
    // ─────────────────────────────────────────────────────────────────────────
    "/users": {
      post: {
        tags: ["Users"],
        summary: "Register User",
        description: "Creates a new user record. In crypto mode, automatically generates an invisible Stellar wallet keypair.\n\n**Source:** `UsersController.create` in `src/users/users.controller.ts` (DTO: `CreateUserDto`)",
        operationId: "createUser",
        security: [{ BearerAuth: ["write"] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateUserDto" } } },
        },
        responses: {
          "201": { description: "User registered with wallet", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
        "x-controller": "UsersController",
        "x-dto": "CreateUserDto",
        "x-source-file": "src/users/users.controller.ts",
      },
      get: {
        tags: ["Users"],
        summary: "List Users",
        description: "Retrieves a paginated list of marketplace users.\n\n**Source:** `UsersController.findAll` in `src/users/users.controller.ts`",
        operationId: "listUsers",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "type", in: "query", schema: { type: "string", enum: ["BUYER", "SELLER", "BOTH"] } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Paginated users", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "UsersController",
        "x-source-file": "src/users/users.controller.ts",
      },
    },
    "/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get User by ID",
        description: "Retrieves complete user record including wallet public key and balance summary.\n\n**Source:** `UsersController.findOne` in `src/users/users.controller.ts`",
        operationId: "getUserById",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "User ID (usr_...)" },
        ],
        responses: {
          "200": { description: "User details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "404": { $ref: "#/components/responses/NotFoundError" },
        },
        "x-controller": "UsersController",
        "x-source-file": "src/users/users.controller.ts",
      },
      patch: {
        tags: ["Users"],
        summary: "Update User",
        description: "Updates user email or custom metadata.\n\n**Source:** `UsersController.update` in `src/users/users.controller.ts` (DTO: `UpdateUserDto`)",
        operationId: "updateUser",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "User ID" },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateUserDto" } } },
        },
        responses: {
          "200": { description: "User updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "404": { $ref: "#/components/responses/NotFoundError" },
        },
        "x-controller": "UsersController",
        "x-dto": "UpdateUserDto",
        "x-source-file": "src/users/users.controller.ts",
      },
    },
    "/users/{id}/airtm-link": {
      post: {
        tags: ["Users"],
        summary: "Link AirTM Account",
        description: "Links external AirTM user identity to enable AirTM payins and payouts.\n\n**Source:** `UsersController.linkAirtm` in `src/users/users.controller.ts` (DTO: `LinkAirtmAccountDto`)",
        operationId: "linkAirtmAccount",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "User ID" },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LinkAirtmAccountDto" } } },
        },
        responses: {
          "200": { description: "AirTM account linked successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "UsersController",
        "x-dto": "LinkAirtmAccountDto",
        "x-source-file": "src/users/users.controller.ts",
      },
    },
    "/users/{id}/balance": {
      get: {
        tags: ["Users", "Balance"],
        summary: "Get User Balance (Alias)",
        description: "Returns balance breakdown for the given user.\n\n**Source:** `UsersController.getBalance` in `src/users/users.controller.ts`",
        operationId: "getUserBalanceAlias",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "User ID" },
        ],
        responses: {
          "200": { description: "User balance", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "UsersController",
        "x-source-file": "src/users/users.controller.ts",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 3. BALANCE MODULE (BalanceController - src/balance/balance.controller.ts)
    // ─────────────────────────────────────────────────────────────────────────
    "/balance/{userId}": {
      get: {
        tags: ["Balance"],
        summary: "Get User Balance",
        description: "Returns per-user available and reserved funds breakdown.\n\n**Source:** `BalanceController.getBalance` in `src/balance/balance.controller.ts`",
        operationId: "getUserBalance",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" }, description: "User ID" },
        ],
        responses: {
          "200": { description: "Current balance", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "404": { $ref: "#/components/responses/NotFoundError" },
        },
        "x-controller": "BalanceController",
        "x-source-file": "src/balance/balance.controller.ts",
      },
    },
    "/balance/{userId}/sync": {
      post: {
        tags: ["Balance"],
        summary: "Sync User Balance",
        description: "Forces a balance synchronization against on-chain Stellar trustline or external provider.\n\n**Source:** `BalanceController.syncBalance` in `src/balance/balance.controller.ts`",
        operationId: "syncUserBalance",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" }, description: "User ID" },
        ],
        responses: {
          "200": { description: "Synced balance", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "BalanceController",
        "x-source-file": "src/balance/balance.controller.ts",
      },
    },
    "/balance/{userId}/reserve": {
      post: {
        tags: ["Balance"],
        summary: "Reserve Funds",
        description: "Moves funds from available to reserved status for an order.\n\n**Source:** `BalanceController.reserve` in `src/balance/balance.controller.ts` (DTO: `ReserveBalanceDto`)",
        operationId: "reserveUserBalance",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" }, description: "User ID" },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ReserveBalanceDto" } } },
        },
        responses: {
          "200": { description: "Funds reserved", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "422": { description: "Insufficient available funds" },
        },
        "x-controller": "BalanceController",
        "x-dto": "ReserveBalanceDto",
        "x-source-file": "src/balance/balance.controller.ts",
      },
    },
    "/balance/{userId}/release": {
      post: {
        tags: ["Balance"],
        summary: "Release Reserved Funds",
        description: "Releases reserved funds back to available balance upon cancellation.\n\n**Source:** `BalanceController.release` in `src/balance/balance.controller.ts` (DTO: `ReleaseBalanceDto`)",
        operationId: "releaseUserBalance",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" }, description: "User ID" },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ReleaseBalanceDto" } } },
        },
        responses: {
          "200": { description: "Funds released to available", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "BalanceController",
        "x-dto": "ReleaseBalanceDto",
        "x-source-file": "src/balance/balance.controller.ts",
      },
    },
    "/balance/{userId}/credit": {
      post: {
        tags: ["Balance"],
        summary: "Credit User Balance",
        description: "Admin or support credit adjustment directly incrementing available balance.\n\n**Source:** `BalanceController.credit` in `src/balance/balance.controller.ts` (DTO: `CreditBalanceDto`)",
        operationId: "creditUserBalance",
        security: [{ BearerAuth: ["support"] }],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" }, description: "User ID" },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreditBalanceDto" } } },
        },
        responses: {
          "200": { description: "Balance credited", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "BalanceController",
        "x-dto": "CreditBalanceDto",
        "x-source-file": "src/balance/balance.controller.ts",
      },
    },
    "/balance/{userId}/debit": {
      post: {
        tags: ["Balance"],
        summary: "Debit User Balance",
        description: "Admin or support debit adjustment directly decrementing available balance.\n\n**Source:** `BalanceController.debit` in `src/balance/balance.controller.ts` (DTO: `DebitBalanceDto`)",
        operationId: "debitUserBalance",
        security: [{ BearerAuth: ["support"] }],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" }, description: "User ID" },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/DebitBalanceDto" } } },
        },
        responses: {
          "200": { description: "Balance debited", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "BalanceController",
        "x-dto": "DebitBalanceDto",
        "x-source-file": "src/balance/balance.controller.ts",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 4. ORDERS MODULE (OrdersController - src/orders/orders.controller.ts)
    // ─────────────────────────────────────────────────────────────────────────
    "/orders": {
      post: {
        tags: ["Orders"],
        summary: "Create Order",
        description: "Creates a new commercial order record. Accepts `Idempotency-Key` header.\n\n**Source:** `OrdersController.create` in `src/orders/orders.controller.ts` (DTO: `CreateOrderDto`)",
        operationId: "createOrder",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "Idempotency-Key", in: "header", required: false, schema: { type: "string", format: "uuid" }, description: "Idempotency key for request deduplication" },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateOrderDto" } } },
        },
        responses: {
          "201": { description: "Order created", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
        "x-controller": "OrdersController",
        "x-dto": "CreateOrderDto",
        "x-source-file": "src/orders/orders.controller.ts",
      },
      get: {
        tags: ["Orders"],
        summary: "List Orders",
        description: "Retrieves a paginated list of orders with filter criteria.\n\n**Source:** `OrdersController.findAll` in `src/orders/orders.controller.ts`",
        operationId: "listOrders",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "buyerId", in: "query", schema: { type: "string" } },
          { name: "sellerId", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "List of orders", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "OrdersController",
        "x-source-file": "src/orders/orders.controller.ts",
      },
    },
    "/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Get Order by ID",
        description: "Retrieves complete order record including status, escrow link, and milestone details.\n\n**Source:** `OrdersController.findOne` in `src/orders/orders.controller.ts`",
        operationId: "getOrderById",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Order ID (ord_...)" },
        ],
        responses: {
          "200": { description: "Order details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "404": { $ref: "#/components/responses/NotFoundError" },
        },
        "x-controller": "OrdersController",
        "x-source-file": "src/orders/orders.controller.ts",
      },
    },
    "/orders/{id}/reserve": {
      post: {
        tags: ["Orders"],
        summary: "Reserve Order Funds",
        description: "Locks buyer available balance for this order (`FUNDS_RESERVED`).\n\n**Source:** `OrdersController.reserveFunds` in `src/orders/orders.controller.ts` (DTO: `ReserveOrderDto`)",
        operationId: "reserveOrderFunds",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Order ID" },
          { name: "Idempotency-Key", in: "header", required: false, schema: { type: "string" } },
        ],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ReserveOrderDto" } } },
        },
        responses: {
          "200": { description: "Funds reserved", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "422": { description: "Insufficient buyer balance" },
        },
        "x-controller": "OrdersController",
        "x-dto": "ReserveOrderDto",
        "x-source-file": "src/orders/orders.controller.ts",
      },
    },
    "/orders/{id}/cancel": {
      post: {
        tags: ["Orders"],
        summary: "Cancel Pre-Escrow Order",
        description: "Cancels an order before escrow funding and returns any reserved balance to buyer (`CLOSED`).\n\n**Source:** `OrdersController.cancel` in `src/orders/orders.controller.ts` (DTO: `CancelOrderDto`)",
        operationId: "cancelOrder",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Order ID" },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CancelOrderDto" } } },
        },
        responses: {
          "200": { description: "Order canceled and funds refunded", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "409": { $ref: "#/components/responses/ConflictError" },
        },
        "x-controller": "OrdersController",
        "x-dto": "CancelOrderDto",
        "x-source-file": "src/orders/orders.controller.ts",
      },
    },
    "/orders/{id}/escrow": {
      post: {
        tags: ["Orders", "Escrow"],
        summary: "Deploy Escrow for Order",
        description: "Deploys a Trustless Work Soroban escrow smart contract on Stellar (`ESCROW_CREATING` -> `ESCROW_CREATED`).\n\n**Source:** `OrdersController.createEscrow` in `src/orders/orders.controller.ts` (DTO: `CreateOrderEscrowDto`)",
        operationId: "createOrderEscrow",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Order ID" },
        ],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateOrderEscrowDto" } } },
        },
        responses: {
          "200": { description: "Escrow deployed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "OrdersController",
        "x-dto": "CreateOrderEscrowDto",
        "x-source-file": "src/orders/orders.controller.ts",
      },
    },
    "/orders/{id}/escrow/fund": {
      post: {
        tags: ["Orders", "Escrow"],
        summary: "Fund Order Escrow",
        description: "Signs on-chain funding transaction with buyer invisible wallet. Moves order to `IN_PROGRESS`.\n\n**Source:** `OrdersController.fundEscrow` in `src/orders/orders.controller.ts`",
        operationId: "fundOrderEscrow",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Order ID" },
        ],
        responses: {
          "200": { description: "Escrow funded on-chain", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "OrdersController",
        "x-source-file": "src/orders/orders.controller.ts",
      },
    },
    "/orders/{id}/resolution/release": {
      post: {
        tags: ["Orders", "Resolution"],
        summary: "Release Escrow to Seller",
        description: "Executes 3 Stellar transactions to complete milestone and release funds to seller wallet (`CLOSED`).\n\n**Source:** `OrdersController.release` in `src/orders/orders.controller.ts` (DTO: `ReleaseOrderDto`)",
        operationId: "releaseOrderEscrow",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Order ID" },
        ],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ReleaseOrderDto" } } },
        },
        responses: {
          "200": { description: "Escrow released to seller", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "OrdersController",
        "x-dto": "ReleaseOrderDto",
        "x-source-file": "src/orders/orders.controller.ts",
      },
    },
    "/orders/{id}/resolution/refund": {
      post: {
        tags: ["Orders", "Resolution"],
        summary: "Refund Escrow to Buyer",
        description: "Executes 2 Stellar transactions (dispute + 100% resolve) to return funds to buyer wallet (`CLOSED`).\n\n**Source:** `OrdersController.refund` in `src/orders/orders.controller.ts` (DTO: `RefundOrderDto`)",
        operationId: "refundOrderEscrow",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Order ID" },
        ],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RefundOrderDto" } } },
        },
        responses: {
          "200": { description: "Escrow refunded to buyer", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "OrdersController",
        "x-dto": "RefundOrderDto",
        "x-source-file": "src/orders/orders.controller.ts",
      },
    },
    "/orders/{id}/resolution/dispute": {
      post: {
        tags: ["Orders", "Disputes"],
        summary: "Open Dispute on Order",
        description: "Freezes in-progress order and creates a formal dispute for arbitration (`DISPUTED`).\n\n**Source:** `OrdersController.openDispute` in `src/orders/orders.controller.ts` (DTO: `OpenOrderDisputeDto`)",
        operationId: "openOrderDispute",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Order ID" },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/OpenOrderDisputeDto" } } },
        },
        responses: {
          "200": { description: "Dispute opened", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "409": { $ref: "#/components/responses/ConflictError" },
        },
        "x-controller": "OrdersController",
        "x-dto": "OpenOrderDisputeDto",
        "x-source-file": "src/orders/orders.controller.ts",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 5. ESCROW MODULE (EscrowController - src/escrow/escrow.controller.ts)
    // ─────────────────────────────────────────────────────────────────────────
    "/escrow": {
      post: {
        tags: ["Escrow"],
        summary: "Create Escrow Contract",
        description: "Direct escrow creation endpoint for deploying Soroban smart contracts.\n\n**Source:** `EscrowController.create` in `src/escrow/escrow.controller.ts` (DTO: `CreateEscrowDto`)",
        operationId: "createEscrow",
        security: [{ BearerAuth: ["write"] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateEscrowDto" } } },
        },
        responses: {
          "201": { description: "Escrow created", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "EscrowController",
        "x-dto": "CreateEscrowDto",
        "x-source-file": "src/escrow/escrow.controller.ts",
      },
      get: {
        tags: ["Escrow"],
        summary: "List Escrows",
        description: "Lists all deployed escrow contracts.\n\n**Source:** `EscrowController.findAll` in `src/escrow/escrow.controller.ts`",
        operationId: "listEscrows",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "List of escrows", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "EscrowController",
        "x-source-file": "src/escrow/escrow.controller.ts",
      },
    },
    "/escrow/{id}": {
      get: {
        tags: ["Escrow"],
        summary: "Get Escrow Details",
        description: "Retrieves complete escrow contract data, signers, and on-chain Soroban contract ID.\n\n**Source:** `EscrowController.findOne` in `src/escrow/escrow.controller.ts`",
        operationId: "getEscrowById",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Escrow ID" },
        ],
        responses: {
          "200": { description: "Escrow contract details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "404": { $ref: "#/components/responses/NotFoundError" },
        },
        "x-controller": "EscrowController",
        "x-source-file": "src/escrow/escrow.controller.ts",
      },
    },
    "/escrow/{id}/fund": {
      post: {
        tags: ["Escrow"],
        summary: "Fund Escrow Direct",
        description: "Executes on-chain fund transfer for the given escrow contract.\n\n**Source:** `EscrowController.fund` in `src/escrow/escrow.controller.ts`",
        operationId: "fundEscrowDirect",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Escrow ID" },
        ],
        responses: {
          "200": { description: "Escrow funded", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "EscrowController",
        "x-source-file": "src/escrow/escrow.controller.ts",
      },
    },
    "/escrow/{id}/sync": {
      post: {
        tags: ["Escrow"],
        summary: "Sync Escrow State",
        description: "Polls Trustless Work and Stellar Horizon to synchronize local DB state.\n\n**Source:** `EscrowController.sync` in `src/escrow/escrow.controller.ts`",
        operationId: "syncEscrowState",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Escrow ID" },
        ],
        responses: {
          "200": { description: "Escrow state updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "EscrowController",
        "x-source-file": "src/escrow/escrow.controller.ts",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 6. RESOLUTION MODULE (ResolutionController - src/resolution/resolution.controller.ts)
    // ─────────────────────────────────────────────────────────────────────────
    "/resolution/release": {
      post: {
        tags: ["Resolution"],
        summary: "Execute Release",
        description: "Executes 3-tx on-chain milestone completion, approval, and release to seller.\n\n**Source:** `ResolutionController.release` in `src/resolution/resolution.controller.ts` (DTO: `ResolutionReleaseDto`)",
        operationId: "resolutionRelease",
        security: [{ BearerAuth: ["write"] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ResolutionReleaseDto" } } },
        },
        responses: {
          "200": { description: "Release executed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "ResolutionController",
        "x-dto": "ResolutionReleaseDto",
        "x-source-file": "src/resolution/resolution.controller.ts",
      },
    },
    "/resolution/refund": {
      post: {
        tags: ["Resolution"],
        summary: "Execute Refund",
        description: "Executes 2-tx on-chain dispute and 100% refund resolution to buyer.\n\n**Source:** `ResolutionController.refund` in `src/resolution/resolution.controller.ts` (DTO: `ResolutionRefundDto`)",
        operationId: "resolutionRefund",
        security: [{ BearerAuth: ["write"] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ResolutionRefundDto" } } },
        },
        responses: {
          "200": { description: "Refund executed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "ResolutionController",
        "x-dto": "ResolutionRefundDto",
        "x-source-file": "src/resolution/resolution.controller.ts",
      },
    },
    "/resolution/resolve": {
      post: {
        tags: ["Resolution"],
        summary: "Execute Dispute Resolution",
        description: "Arbitrates a dispute with arbitrated fund distribution (FULL_RELEASE, FULL_REFUND, or SPLIT).\n\n**Source:** `ResolutionController.resolve` in `src/resolution/resolution.controller.ts` (DTO: `ResolutionResolveDto`)",
        operationId: "resolutionResolve",
        security: [{ BearerAuth: ["support"] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ResolutionResolveDto" } } },
        },
        responses: {
          "200": { description: "Dispute decision executed on-chain", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "ResolutionController",
        "x-dto": "ResolutionResolveDto",
        "x-source-file": "src/resolution/resolution.controller.ts",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 7. TOPUPS MODULE (TopUpsController - src/topups/topups.controller.ts)
    // ─────────────────────────────────────────────────────────────────────────
    "/topups": {
      post: {
        tags: ["TopUps"],
        summary: "Create Fiat Top-Up",
        description: "Initiates AirTM payin request and returns confirmation URI for user redirection.\n\n**Source:** `TopUpsController.create` in `src/topups/topups.controller.ts` (DTO: `CreateTopUpDto`)",
        operationId: "createTopUp",
        security: [{ BearerAuth: ["write"] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateTopUpDto" } } },
        },
        responses: {
          "201": { description: "Top-up initialized with confirmationUri", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "TopUpsController",
        "x-dto": "CreateTopUpDto",
        "x-source-file": "src/topups/topups.controller.ts",
      },
      get: {
        tags: ["TopUps"],
        summary: "List Top-Ups",
        description: "Retrieves a paginated list of top-up transactions.\n\n**Source:** `TopUpsController.findAll` in `src/topups/topups.controller.ts`",
        operationId: "listTopUps",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "userId", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "List of top-ups", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "TopUpsController",
        "x-source-file": "src/topups/topups.controller.ts",
      },
    },
    "/topups/{id}": {
      get: {
        tags: ["TopUps"],
        summary: "Get Top-Up Status",
        description: "Retrieves top-up transaction status and external payment confirmation details.\n\n**Source:** `TopUpsController.findOne` in `src/topups/topups.controller.ts`",
        operationId: "getTopUpById",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Top-Up ID (tp_...)" },
        ],
        responses: {
          "200": { description: "Top-up details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "404": { $ref: "#/components/responses/NotFoundError" },
        },
        "x-controller": "TopUpsController",
        "x-source-file": "src/topups/topups.controller.ts",
      },
    },
    "/topups/{id}/cancel": {
      post: {
        tags: ["TopUps"],
        summary: "Cancel Top-Up",
        description: "Cancels an unconfirmed pending top-up.\n\n**Source:** `TopUpsController.cancel` in `src/topups/topups.controller.ts`",
        operationId: "cancelTopUp",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Top-Up ID" },
        ],
        responses: {
          "200": { description: "Top-up canceled", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "TopUpsController",
        "x-source-file": "src/topups/topups.controller.ts",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 8. WITHDRAWALS MODULE (WithdrawalsController - src/withdrawals/withdrawals.controller.ts)
    // ─────────────────────────────────────────────────────────────────────────
    "/withdrawals": {
      post: {
        tags: ["Withdrawals"],
        summary: "Create Withdrawal",
        description: "Initiates fund withdrawal. In crypto mode, executes Stellar USDC payment synchronously.\n\n**Source:** `WithdrawalsController.create` in `src/withdrawals/withdrawals.controller.ts` (DTO: `CreateWithdrawalDto`)",
        operationId: "createWithdrawal",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "Idempotency-Key", in: "header", required: false, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateWithdrawalDto" } } },
        },
        responses: {
          "201": { description: "Withdrawal completed or created", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "422": { description: "Insufficient available balance" },
        },
        "x-controller": "WithdrawalsController",
        "x-dto": "CreateWithdrawalDto",
        "x-source-file": "src/withdrawals/withdrawals.controller.ts",
      },
      get: {
        tags: ["Withdrawals"],
        summary: "List Withdrawals",
        description: "Retrieves paginated withdrawal history.\n\n**Source:** `WithdrawalsController.findAll` in `src/withdrawals/withdrawals.controller.ts`",
        operationId: "listWithdrawals",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "userId", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "List of withdrawals", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "WithdrawalsController",
        "x-source-file": "src/withdrawals/withdrawals.controller.ts",
      },
    },
    "/withdrawals/{id}": {
      get: {
        tags: ["Withdrawals"],
        summary: "Get Withdrawal Status",
        description: "Retrieves withdrawal transaction status and blockchain transaction hash.\n\n**Source:** `WithdrawalsController.findOne` in `src/withdrawals/withdrawals.controller.ts`",
        operationId: "getWithdrawalById",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Withdrawal ID (wd_...)" },
        ],
        responses: {
          "200": { description: "Withdrawal details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "404": { $ref: "#/components/responses/NotFoundError" },
        },
        "x-controller": "WithdrawalsController",
        "x-source-file": "src/withdrawals/withdrawals.controller.ts",
      },
    },
    "/withdrawals/{id}/commit": {
      post: {
        tags: ["Withdrawals"],
        summary: "Commit AirTM Withdrawal",
        description: "Commits a pending AirTM payout, debits user balance, and submits to AirTM.\n\n**Source:** `WithdrawalsController.commit` in `src/withdrawals/withdrawals.controller.ts`",
        operationId: "commitWithdrawal",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Withdrawal ID" },
        ],
        responses: {
          "200": { description: "Withdrawal committed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "WithdrawalsController",
        "x-source-file": "src/withdrawals/withdrawals.controller.ts",
      },
    },
    "/withdrawals/{id}/cancel": {
      post: {
        tags: ["Withdrawals"],
        summary: "Cancel Pending Withdrawal",
        description: "Cancels an uncommitted withdrawal.\n\n**Source:** `WithdrawalsController.cancel` in `src/withdrawals/withdrawals.controller.ts`",
        operationId: "cancelWithdrawal",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Withdrawal ID" },
        ],
        responses: {
          "200": { description: "Withdrawal canceled", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "WithdrawalsController",
        "x-source-file": "src/withdrawals/withdrawals.controller.ts",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 9. DISPUTES MODULE (DisputesController - src/disputes/disputes.controller.ts)
    // ─────────────────────────────────────────────────────────────────────────
    "/disputes": {
      post: {
        tags: ["Disputes"],
        summary: "Open Dispute",
        description: "Direct dispute creation endpoint for arbitration cases.\n\n**Source:** `DisputesController.create` in `src/disputes/disputes.controller.ts` (DTO: `CreateDisputeDto`)",
        operationId: "createDispute",
        security: [{ BearerAuth: ["write"] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateDisputeDto" } } },
        },
        responses: {
          "201": { description: "Dispute opened", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "DisputesController",
        "x-dto": "CreateDisputeDto",
        "x-source-file": "src/disputes/disputes.controller.ts",
      },
      get: {
        tags: ["Disputes"],
        summary: "List Disputes",
        description: "Retrieves a paginated list of arbitration disputes.\n\n**Source:** `DisputesController.findAll` in `src/disputes/disputes.controller.ts`",
        operationId: "listDisputes",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["OPEN", "UNDER_REVIEW", "RESOLVED"] } },
          { name: "assignedTo", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "List of disputes", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "DisputesController",
        "x-source-file": "src/disputes/disputes.controller.ts",
      },
    },
    "/disputes/{id}": {
      get: {
        tags: ["Disputes"],
        summary: "Get Dispute Details",
        description: "Retrieves complete dispute information, assigned agent, evidence, and order context.\n\n**Source:** `DisputesController.findOne` in `src/disputes/disputes.controller.ts`",
        operationId: "getDisputeById",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Dispute ID (dsp_...)" },
        ],
        responses: {
          "200": { description: "Dispute details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "404": { $ref: "#/components/responses/NotFoundError" },
        },
        "x-controller": "DisputesController",
        "x-source-file": "src/disputes/disputes.controller.ts",
      },
    },
    "/disputes/{id}/assign": {
      post: {
        tags: ["Disputes"],
        summary: "Assign Dispute",
        description: "Assigns a dispute to a support agent (`UNDER_REVIEW`).\n\n**Source:** `DisputesController.assign` in `src/disputes/disputes.controller.ts` (DTO: `AssignDisputeDto`)",
        operationId: "assignDispute",
        security: [{ BearerAuth: ["support"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Dispute ID" },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AssignDisputeDto" } } },
        },
        responses: {
          "200": { description: "Dispute assigned to agent", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "DisputesController",
        "x-dto": "AssignDisputeDto",
        "x-source-file": "src/disputes/disputes.controller.ts",
      },
    },
    "/disputes/{id}/resolve": {
      post: {
        tags: ["Disputes"],
        summary: "Resolve Dispute",
        description: "Executes arbitrated decision on-chain (FULL_RELEASE, FULL_REFUND, or SPLIT).\n\n**Source:** `DisputesController.resolve` in `src/disputes/disputes.controller.ts` (DTO: `ResolveDisputeDto`)",
        operationId: "resolveDispute",
        security: [{ BearerAuth: ["support"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Dispute ID" },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ResolveDisputeDto" } } },
        },
        responses: {
          "200": { description: "Dispute resolved and funds distributed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "DisputesController",
        "x-dto": "ResolveDisputeDto",
        "x-source-file": "src/disputes/disputes.controller.ts",
      },
    },
    "/disputes/{id}/comments": {
      post: {
        tags: ["Disputes"],
        summary: "Add Dispute Comment",
        description: "Appends a message or evidence attachment to a dispute thread.\n\n**Source:** `DisputesController.addComment` in `src/disputes/disputes.controller.ts` (DTO: `AddDisputeCommentDto`)",
        operationId: "addDisputeComment",
        security: [{ BearerAuth: ["write", "support"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Dispute ID" },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AddDisputeCommentDto" } } },
        },
        responses: {
          "201": { description: "Comment added", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "DisputesController",
        "x-dto": "AddDisputeCommentDto",
        "x-source-file": "src/disputes/disputes.controller.ts",
      },
      get: {
        tags: ["Disputes"],
        summary: "List Dispute Comments",
        description: "Retrieves all comments in chronological order for a dispute case.\n\n**Source:** `DisputesController.listComments` in `src/disputes/disputes.controller.ts`",
        operationId: "listDisputeComments",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Dispute ID" },
        ],
        responses: {
          "200": { description: "List of dispute comments", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "DisputesController",
        "x-source-file": "src/disputes/disputes.controller.ts",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 10. EVENTS MODULE (EventsController - src/events/events.controller.ts)
    // ─────────────────────────────────────────────────────────────────────────
    "/events": {
      get: {
        tags: ["Events"],
        summary: "Real-Time Event Stream (SSE)",
        description: "Establishes a persistent Server-Sent Events (SSE) stream for real-time domain event streaming.\n\n**Source:** `EventsController.streamEvents` in `src/events/events.controller.ts`",
        operationId: "streamEvents",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "types", in: "query", schema: { type: "string" }, description: "Comma-separated event types (e.g. order.created,balance.credited)" },
          { name: "resourceTypes", in: "query", schema: { type: "string" }, description: "Comma-separated resource types (e.g. Order,Balance)" },
          { name: "aggregateId", in: "query", schema: { type: "string" }, description: "Filter by resource ID" },
          { name: "Last-Event-ID", in: "header", required: false, schema: { type: "string" }, description: "Timestamp ID for reconnection replay" },
        ],
        responses: {
          "200": {
            description: "SSE Stream (text/event-stream)",
            content: {
              "text/event-stream": {
                schema: { type: "string" },
              },
            },
          },
        },
        "x-controller": "EventsController",
        "x-source-file": "src/events/events.controller.ts",
      },
    },
    "/events/history": {
      get: {
        tags: ["Events"],
        summary: "Query Historical Events",
        description: "Queries historical domain events stored in the PostgreSQL audit log.\n\n**Source:** `EventsController.getHistory` in `src/events/events.controller.ts`",
        operationId: "getEventHistory",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          { name: "types", in: "query", schema: { type: "string" } },
          { name: "aggregateId", in: "query", schema: { type: "string" } },
          { name: "fromTimestamp", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "toTimestamp", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: {
          "200": { description: "Historical event records", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "EventsController",
        "x-source-file": "src/events/events.controller.ts",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 11. WALLET MODULE (WalletController - src/wallet/wallet.controller.ts)
    // ─────────────────────────────────────────────────────────────────────────
    "/wallet/deposit-address": {
      get: {
        tags: ["Wallet"],
        summary: "Get Deposit Address (Caller)",
        description: "Returns the permanent Stellar USDC deposit address for the authenticated user.\n\n**Source:** `WalletController.getCallerDepositAddress` in `src/wallet/wallet.controller.ts`",
        operationId: "getCallerDepositAddress",
        security: [{ BearerAuth: ["read"] }],
        responses: {
          "200": { description: "Deposit address details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "WalletController",
        "x-source-file": "src/wallet/wallet.controller.ts",
      },
    },
    "/wallet/{userId}/deposit-address": {
      get: {
        tags: ["Wallet"],
        summary: "Get User Deposit Address",
        description: "Returns the Stellar USDC deposit address for a specified user ID.\n\n**Source:** `WalletController.getDepositAddress` in `src/wallet/wallet.controller.ts`",
        operationId: "getUserDepositAddress",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" }, description: "User ID" },
        ],
        responses: {
          "200": { description: "Deposit address details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "WalletController",
        "x-source-file": "src/wallet/wallet.controller.ts",
      },
    },
    "/wallet/{userId}": {
      get: {
        tags: ["Wallet"],
        summary: "Get User Wallet Info",
        description: "Retrieves wallet public key and trustline status for a user.\n\n**Source:** `WalletController.getWalletInfo` in `src/wallet/wallet.controller.ts`",
        operationId: "getUserWalletInfo",
        security: [{ BearerAuth: ["read"] }],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" }, description: "User ID" },
        ],
        responses: {
          "200": { description: "Wallet metadata", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "WalletController",
        "x-source-file": "src/wallet/wallet.controller.ts",
      },
    },
    "/wallet/{userId}/sync": {
      post: {
        tags: ["Wallet"],
        summary: "Sync Wallet On-Chain State",
        description: "Queries Horizon to synchronize account sequence numbers and balances.\n\n**Source:** `WalletController.sync` in `src/wallet/wallet.controller.ts`",
        operationId: "syncWalletState",
        security: [{ BearerAuth: ["write"] }],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" }, description: "User ID" },
        ],
        responses: {
          "200": { description: "Wallet synced", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "WalletController",
        "x-source-file": "src/wallet/wallet.controller.ts",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 12. AUDIT MODULE (AuditController - src/audit/audit.controller.ts)
    // ─────────────────────────────────────────────────────────────────────────
    "/audit": {
      get: {
        tags: ["Audit"],
        summary: "List Audit Logs",
        description: "Lists immutable audit logs of state transitions and sensitive mutations. Requires support or master scope.\n\n**Source:** `AuditController.findAll` in `src/audit/audit.controller.ts`",
        operationId: "listAuditLogs",
        security: [{ BearerAuth: ["support"] }, { MasterKeyAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "actorId", in: "query", schema: { type: "string" } },
          { name: "resourceType", in: "query", schema: { type: "string" } },
          { name: "resourceId", in: "query", schema: { type: "string" } },
          { name: "action", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "List of audit logs", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "AuditController",
        "x-source-file": "src/audit/audit.controller.ts",
      },
    },
    "/audit/{id}": {
      get: {
        tags: ["Audit"],
        summary: "Get Audit Log Details",
        description: "Retrieves complete audit record including redacted before/after state snapshots.\n\n**Source:** `AuditController.findOne` in `src/audit/audit.controller.ts`",
        operationId: "getAuditLogById",
        security: [{ BearerAuth: ["support"] }, { MasterKeyAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Audit Log ID (aud_...)" },
        ],
        responses: {
          "200": { description: "Audit log details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "404": { $ref: "#/components/responses/NotFoundError" },
        },
        "x-controller": "AuditController",
        "x-source-file": "src/audit/audit.controller.ts",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 13. WEBHOOKS MODULE (WebhooksController - src/webhooks/webhooks.controller.ts)
    // ─────────────────────────────────────────────────────────────────────────
    "/webhooks/airtm": {
      post: {
        tags: ["Webhooks"],
        summary: "AirTM Ingress Webhook",
        description: "Public ingress endpoint for AirTM asynchronous payin and payout events. Validated via HMAC signature.\n\n**Source:** `WebhooksController.handleAirtmWebhook` in `src/webhooks/webhooks.controller.ts`",
        operationId: "handleAirtmWebhook",
        security: [{ AirtmHmacAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  event: { type: "string", example: "payin.succeeded" },
                  payinId: { type: "string", example: "airtm_payin_123" },
                  payoutId: { type: "string" },
                  data: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Webhook received and queued for background BullMQ processing", content: { "application/json": { schema: { type: "object", properties: { received: { type: "boolean", example: true } } } } } },
        },
        "x-controller": "WebhooksController",
        "x-source-file": "src/webhooks/webhooks.controller.ts",
      },
    },
    "/webhooks/trustless-work": {
      post: {
        tags: ["Webhooks"],
        summary: "Trustless Work Ingress Webhook",
        description: "Public ingress endpoint for Trustless Work smart contract lifecycle events. Validated via HMAC signature.\n\n**Source:** `WebhooksController.handleTrustlessWorkWebhook` in `src/webhooks/webhooks.controller.ts`",
        operationId: "handleTrustlessWorkWebhook",
        security: [{ TrustlessWorkHmacAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  event: { type: "string", example: "escrow.funded" },
                  contractId: { type: "string", example: "CBX249SDF..." },
                  data: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Webhook received", content: { "application/json": { schema: { type: "object", properties: { received: { type: "boolean", example: true } } } } } },
        },
        "x-controller": "WebhooksController",
        "x-source-file": "src/webhooks/webhooks.controller.ts",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 14. SYSTEM & HEALTH (HealthController & SystemController)
    // ─────────────────────────────────────────────────────────────────────────
    "/health": {
      get: {
        tags: ["System & Health"],
        summary: "Health Check",
        description: "Returns basic service health status, uptime, and component status.\n\n**Source:** `HealthController.check` in `src/health/health.controller.ts`",
        operationId: "getHealth",
        responses: {
          "200": { description: "Health status", content: { "application/json": { schema: { $ref: "#/components/schemas/HealthStatus" } } } },
        },
        "x-controller": "HealthController",
        "x-source-file": "src/health/health.controller.ts",
      },
    },
    "/health/ready": {
      get: {
        tags: ["System & Health"],
        summary: "Readiness Probe",
        description: "Kubernetes / container readiness probe verifying DB, Redis, and Horizon connectivity.\n\n**Source:** `HealthController.readiness` in `src/health/health.controller.ts`",
        operationId: "getReadiness",
        responses: {
          "200": { description: "System ready", content: { "application/json": { schema: { $ref: "#/components/schemas/HealthStatus" } } } },
          "503": { description: "System not ready" },
        },
        "x-controller": "HealthController",
        "x-source-file": "src/health/health.controller.ts",
      },
    },
    "/health/live": {
      get: {
        tags: ["System & Health"],
        summary: "Liveness Probe",
        description: "Lightweight liveness probe checking process response.\n\n**Source:** `HealthController.liveness` in `src/health/health.controller.ts`",
        operationId: "getLiveness",
        responses: {
          "200": { description: "Process live", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", example: "ok" } } } } } },
        },
        "x-controller": "HealthController",
        "x-source-file": "src/health/health.controller.ts",
      },
    },
    "/system/info": {
      get: {
        tags: ["System & Health"],
        summary: "System Information",
        description: "Retrieves active payment provider, Stellar network mode, and runtime configuration flags.\n\n**Source:** `SystemController.getInfo` in `src/system/system.controller.ts`",
        operationId: "getSystemInfo",
        security: [{ BearerAuth: ["read"] }, { MasterKeyAuth: [] }],
        responses: {
          "200": { description: "System info", content: { "application/json": { schema: { $ref: "#/components/schemas/SystemInfo" } } } },
        },
        "x-controller": "SystemController",
        "x-source-file": "src/system/system.controller.ts",
      },
    },
    "/system/maintenance": {
      post: {
        tags: ["System & Health"],
        summary: "Toggle Maintenance Mode",
        description: "Enables or disables system maintenance mode. When enabled, non-admin mutation requests return 503.\n\n**Source:** `SystemController.setMaintenance` in `src/system/system.controller.ts` (DTO: `MaintenanceModeDto`)",
        operationId: "setMaintenanceMode",
        security: [{ MasterKeyAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/MaintenanceModeDto" } } },
        },
        responses: {
          "200": { description: "Maintenance mode updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
        },
        "x-controller": "SystemController",
        "x-dto": "MaintenanceModeDto",
        "x-source-file": "src/system/system.controller.ts",
      },
    },
  },
};

export function generateOpenApi(options: { check?: boolean } = {}) {
  const rootDir = process.cwd();
  const outputPath = path.join(rootDir, "public", "openapi.json");
  const jsonContent = JSON.stringify(openApiSpec, null, 2);

  if (options.check) {
    if (!fs.existsSync(outputPath)) {
      console.error(`❌ Validation failed: ${outputPath} does not exist.`);
      process.exit(1);
    }
    const existingContent = fs.readFileSync(outputPath, "utf-8");
    if (existingContent.trim() !== jsonContent.trim()) {
      console.error(`❌ Validation failed: ${outputPath} is out of sync with generator script.`);
      process.exit(1);
    }
    console.log("✅ OpenAPI 3.0 spec in public/openapi.json is valid and up to date.");
    return;
  }

  // Ensure public directory exists
  const publicDir = path.join(rootDir, "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, jsonContent, "utf-8");
  console.log(`✅ Successfully generated OpenAPI 3.0 specification: ${outputPath}`);
  console.log(`   Total paths: ${Object.keys(openApiSpec.paths).length}`);
  console.log(`   Total schemas: ${Object.keys(openApiSpec.components.schemas).length}`);
  console.log(`   Total tags: ${openApiSpec.tags.length}`);
}

// Direct execution CLI check
const isCheckMode = process.argv.includes("--check") || process.argv.includes("-c");
generateOpenApi({ check: isCheckMode });
