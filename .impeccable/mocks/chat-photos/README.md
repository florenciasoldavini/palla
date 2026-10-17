# Photo messages — proposed UI

Pending user approval. Generated with the built-in image-generation tool from the current native chat screenshot. `proposal.png` presents three screens: one-gallery-photo preview with optional caption; a delivered photo in the existing lavender outgoing bubble; and a light full-screen viewer. The bottom strip illustrates waiting for connection, uploading and retry states; these are examples of per-message status, not a permanent panel under the conversation.

The new photo icon opens the platform photo library directly. Retain the existing outline paper-plane send icon and native safe areas. Use the existing lilac background, white received bubbles, lavender sent bubbles, green read checks and same-hue icon circles. Taking photos, documents, voice notes, multiple-image messages, editing, forwarding and saving to the gallery are outside this first UI proposal. The shared attachment foundation should accommodate document/audio metadata later.

Prompt summary: faithfully extend the incumbent Palla native chat with three matching screens and compact upload-state examples; one photo and optional caption; no dark theme, camera/document/microphone controls, progress percentages or custom gallery. The court image is illustrative mockup content, not a production asset.

## Review and revision

The user approved the conversation layout in proposal.png, but rejected its preview and viewer. Keep that conversation layout. The preview/viewer revision `preview-viewer-v2.png` is pending review: full-width photo surfaces, a slim preview toolbar and integrated caption composer, compact viewer overlays and caption footer. Production must preserve image aspect ratios with contain fitting; generated imagery is illustrative. Existing outline paper-plane icon and native safe-area clearance remain required. A photo viewer may hide its controls on tap; no downloading/forwarding was proposed.

## Media-overlay proposal

The user clarified that the objection is UI style, not layout, and requested a consistent overlay material for image controls. `media-overlay-v3.png` is pending approval: translucent charcoal backgrounds, white icons/text, subtle translucent-white borders, circular icon targets and compact rounded metadata/caption surfaces. The preview retains the existing neon/dark-green outline paper-plane send button. Production must fit the full image without stretching/cropping and respect safe areas; the portrait mockup photo is illustrative. This material applies to controls over media, not to the app's light theme. The original conversation mockup remains approved.

The user rejected v3 overlay styling. `media-overlay-options-v4.png` compares three treatments with the same photo/preview layout: A softer charcoal with fewer outlined surfaces; B frosted light controls with dark text; C mostly bare white controls on a restrained contrast scrim. Viewer-control samples show how each material extends to viewing. All are pending selection. No photo UI has been implemented; the conversation view remains approved.

The user specified a glass effect, not flat translucency, and added image downloading to scope. `media-glass-v5.png` is pending approval: visibly frosted background blur, translucent neutral-tinted glass controls, subtle highlight/border, white text/icons, solid neon outline-paper-plane send action. Viewer adds a download-to-tray control to save to the device photo library, with transient success feedback. Request photo-library write permission only when needed; show recovery for denied permission or save failure, and retain protected access to original media. Preserve native safe areas and image proportions. The toast below the mockup is an illustration of transient feedback, not a permanent footer. Conversation layout from the first proposal remains approved.

`media-dark-glass-v6.png` is the requested darker frosted-glass variation, pending approval. It preserves v5's layout, photo saving and neon send button, changing only overlay material to neutral smoky charcoal with visible blur and white content. No photo implementation has started.

## Selected implementation

The user clarified “original” by selecting the earlier full-width revision: **preview-viewer-v2.png**. Implement that white-toolbar preview and light viewer, not the glass alternatives. Keep the conversation photo bubble from proposal.png. Include the subsequently requested Save photo control and permission/success/error handling. This supersedes the pending-approval wording above. Implementation and native QA use a landscape copy of this mockup board as disposable test imagery; the board itself is not a production chat asset.
