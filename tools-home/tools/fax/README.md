# Fax Desk · VT-TOOL-FAX · R5

Open [Vitals Tracker Tools](https://keythjyles.github.io/Vitals-Tracker-v1.0/tools-home/) → **Fax Desk** → **Open private Fax Desk**. Sign in with the authorized ChatGPT account. The same workspace opens on a phone, tablet, or desktop. The Tools page is public. Fax records and provider settings are available after sign-in.

## Send a fax

1. Open **New fax** and enter the recipient’s 10-digit U.S. or Canadian fax number. **VA fax shortcuts** can fill in the VBA or Board number. Follow the destination on your form or notice when it specifies one.
2. Choose **Attach files** for PDF documents or images, **Choose photos** for pictures on your device, or **Take photo** to use the camera on a supported phone. Add as many items as needed in the order they should appear. Each photo becomes one fax page. Save Word documents as PDFs first. If a photo format does not open on your device, use a JPG or PNG copy.
3. Turn on **Create a cover page** if you want one. The optional fields are To, From, Subject, and Message. Fax Desk adds the number, date, and total page count. The cover appears first and counts toward the provider’s page allowance.
4. Choose **Review fax**. Check the exact number, page count, and the assembled PDF. Download a copy if you want to keep the exact packet. The desk accepts a combined PDF of up to 8 MB. For signed or fillable documents, check the assembled preview for the visible signature and filled fields before sending.
5. Choose a provider and send. With **GotFreeFax Free**, use the link in the confirmation email to start transmission, or paste it into Fax Desk. A queued result means the provider accepted the attempt. Use **Check carrier** when available to see the final result. If the result is unclear, open the existing job before trying again. The receipt ledger saves the provider result automatically when it can be checked.

For routine faxes, start with the free options. For an urgent or important fax, consider GotFreeFax prepaid. Direct sending skips the free tier’s email confirmation step. Check the carrier result after sending.

### Limits, alternatives and low credit warnings

Review counts every page, including the optional cover. When a packet exceeds the selected provider’s known limit, the desk holds that send and offers a route that can fit. GotFreeFax Free is the first choice when its limits allow. The desk can offer prepaid credits when the live balance covers the packet. That option uses pages you already purchased and requires no new payment. A recommendation changes the provider only when you choose it. Review and send the same packet after switching.

FaxBurner is a possible free alternative when its free plan and the desk’s records suggest enough pages. Verify the allowance with FaxBurner because the ledger can miss activity outside the desk. FAXAGE cost depends on your account plan and transmission time. The desk identifies options it can verify and marks allowances or rates that need checking. [GotFreeFax limits](https://www.gotfreefax.com/how-it-works) · [FaxBurner limits](https://faxburner.com/pricing/) · [FAXAGE pricing](https://www.faxage.com/pricing.php)

For prepaid, the review shows the estimated balance after sending. Fax Desk warns at **10 pages remaining**, including when a proposed fax would bring you to that level or use your last pages. An insufficient balance holds the send. The desk refreshes the account when you review, offers a manual refresh, and checks the live balance again immediately before submitting a prepaid fax.

| Provider | How it sends | Limits and usage |
| --- | --- | --- |
| GotFreeFax free | Starts from the desk. Confirm the specific job with the link in the sender's email. You can paste that link into the desk or open it from email. | Up to 3 pages per fax and 2 free faxes per day, subject to the provider's email and IP limits. The desk shows its own ledger count. |
| FaxBurner | Sends from the desk when the registered Gmail sender has been connected. Until then use **Other fax methods and filing records** to stage a FaxBurner draft and choose **Prepare email file** and send it from that registered address, or ask ChatGPT to fax from the connected mailbox. | FaxBurner publishes 5 free outbound pages total. The desk shows logged carrier results. Confirm the remaining allowance with FaxBurner. |
| Other fax routes | FAXAGE, one-time web fax, and a fax machine are available as labeled. | These routes use their own accounts, limits, and receipts. |
| GotFreeFax prepaid | Sends directly from the desk using a stored account number and PIN | Refresh for live domestic page credits and recent provider jobs. The carrier reports the actual balance. Prepaid credits do not expire. |

The desk validates PDF format and page count and accepts PDFs up to 8 MB. Keep longer VA packets intact. A Gmail send or provider queue notice means the attempt is pending. A final carrier result means transmission completed.

## Draft a VA evidence statement

1. Add the PDFs or photos you want to submit. Turn on **Draft a VA evidence statement (21-4138)**.
2. Enter the veteran’s name and a VA file number or the optional one-time SSN to identify the record. Use **Save VA profile** to reuse the name, VA file number and birth date you enter. The profile is encrypted for the signed-in owner. **Forget saved profile** removes it. The separate SSN field stays in the current packet.
3. Name the issue, add the VA decision date or Board docket reference when helpful, and describe each exhibit. The draft lists the exhibits in attachment order and keeps your wording.
4. Review the statement text. Leave the signature unchecked for an unsigned draft, or adopt the typed **/s/** signature for this packet. Edits to the statement or exhibits clear signature approval. The generated PDF uses VA’s official two-page 21-4138 and adds continuation pages when needed. [Official 21-4138](https://www.va.gov/forms/21-4138/) · [VBA signature guidance, M21-1 II.i.2.B.2](https://navigatingva.com/law-policy/va-policy/articles/554400000174859/)
5. Choose **Review evidence packet**. Open the PDF to check the statement and exhibits. Leave the fax number blank for a download, or enter the verified fax destination and use the send controls. Fax Desk requires an adopted signature before sending a generated statement. At the Board fax shortcut, it also requires you to confirm the docket is open to the new evidence.

For an existing modernized Board appeal, check the evidence window. Direct Review uses the existing record. Evidence Submission generally allows evidence with the appeal or within 90 days after the Board receives it. The Hearing docket generally allows evidence at the hearing or within 90 days afterward. Follow any specific directions in your notice. Use the prescribed VA Form 10182 or VA’s online process when starting a Board appeal. [VA’s Board docket guidance](https://www.va.gov/decision-reviews/board-appeal/) · [Official VA Form 10182](https://www.va.gov/forms/10182/)

## Record a VA portal filing

Open **Other fax methods and filing records**. Choose **VA portal · record a filing**, select the VA office, and save the draft. The draft links to VA filing guidance for that office. Sign in and file on the applicable VA site, then return to the draft, choose **Portal receipt**, and save the confirmation number or a receipt reference. Saving the draft only creates a ledger entry. Filing and confirmation happen on the VA site.

## Save or replace provider credentials

Open **Provider settings** inside the private desk. The existing GotFreeFax prepaid account is installed as private runtime secrets. To replace it, enter the new account number and PIN. The desk checks the provider balance before accepting the replacement and encrypts saved replacements. A saved PIN or token is never displayed.

FaxBurner uses email-to-fax and identifies the registered sender. For direct sending from the desk, use a Google OAuth client you control with the Gmail API enabled. Authorize the same registered Gmail address for `https://www.googleapis.com/auth/gmail.send` and `openid email`. Request offline access. Enter the OAuth client ID, client secret and refresh token under FaxBurner settings. Do not enter a Google password. See [Google's OAuth guide](https://developers.google.com/identity/protocols/oauth2) and [Gmail send API](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send). If your Google app is in Testing, review Google's refresh-token expiration rules. The desk validates the email identity and send scope before storing the connection. Reauthorize and replace the token if Google revokes it.

For email-file handoff, open the downloaded draft in a mail client that imports unsent `.eml` files. Verify the registered From address, the fax gateway To address, the digits in the Subject, and the attached PDF. In a client that opens the file read-only, compose a message to `send@faxburner.com`, use the 10-digit destination alone as the subject, and attach the original PDF. Leave the body empty if the packet already includes its own cover. Record that it was sent once, then record the final carrier email.

## Logs and receipts

Select a record to see the destination, provider, status changes, known page counts and receipt references. The ledger includes entries already saved in Submission Desk. Use **Export** for a JSON copy. Keep receipt links and export files private. Where a provider does not offer a supported live allowance API, ledger usage is labeled separately from the provider's total. The desk prepares the packet in your browser and keeps receipt references and activity. Download the reviewed PDF to keep a copy of the packet, especially if it contains photos taken in the desk.

## ChatGPT and other platforms

Use the **Submission Desk** plugin where available, or open the private workspace from any modern browser. The plugin can stage a draft, list records, check provider status, read provider usage, and submit an explicitly authorized PDF via a configured direct route.

The authenticated [Submission Desk MCP endpoint](https://submission-desk.kjiles71.chatgpt.site/mcp) supports tool discovery. Use a client that supports the site's OAuth/sign-in. Call `get_fax_providers` for account readiness and balance, `stage_submission` to record the title, route, and method, then `send_fax` with the draft ID, matching 10-digit confirmation number and base64 PDF. For a manually entered destination, use `route: "custom"` and pass the number in `fax` when staging. For GotFreeFax free, also pass the sender name and email, and use `confirm_free_fax` with the received confirmation link. Use `check_submission` with `refresh: true` to fetch status. Tool payloads for sends are limited to a 1 MiB PDF. Use the browser for larger packets. Handle timeouts as uncertain outcomes and check the draft before replaying any operation.

## Hosting and maintenance

GitHub Pages serves this public launcher. The existing private Submission Desk runs the fax integrations and owns the ledger. It checks signed-in identity and owner authorization before accessing provider credentials. The GitHub repo and browser storage contain no provider credentials. Keep the private workspace link in `index.html` current if its address changes.

Server setup needs an owner email, a registered FaxBurner sender, and a 32-byte encryption key supplied as private runtime values. Initial GotFreeFax prepaid credentials can also be seeded through runtime secrets. Deploy the database migration before enabling the settings page. Keep an authorized secure backup of the encryption key. A key change makes previously encrypted connections unreadable unless the records are re-encrypted. Use the admin controls to redeploy after rotating seeded runtime secrets. Monitor provider changes using the official [GotFreeFax API](https://www.gotfreefax.com/fax-api), [GotFreeFax MCP](https://www.gotfreefax.com/mcp-server), and [FaxBurner limits](https://faxburner.com/pricing/).
