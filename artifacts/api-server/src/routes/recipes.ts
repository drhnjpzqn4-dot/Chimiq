import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * Reports whether the current user is allowed to submit DIY recipes.
 *
 * Eligibility rules (v1, #46a):
 *  - Must be authenticated
 *  - The OIDC identity provider must have flagged the email as verified
 *
 * The frontend uses this to gate the "Submit a recipe" entry point and to
 * surface a "verify your email" nudge when needed.
 */
router.get("/recipes/eligibility", (req, res) => {
  if (!req.isAuthenticated()) {
    res.json({
      canSubmit: false,
      reason: "auth_required",
      emailVerified: false,
    });
    return;
  }

  const emailVerified = req.user.emailVerified === true;
  res.json({
    canSubmit: emailVerified,
    reason: emailVerified ? null : "email_unverified",
    emailVerified,
  });
});

export default router;
