const INGREDIENT_LABELS_MEDIA = '/gelitup-media/blog/why-ingredient-labels-matter'
const TPO_GUIDE_MEDIA = '/gelitup-media/blog/tpo-guide'
const HEMA_GUIDE_MEDIA = '/gelitup-media/blog/what-is-hema-in-gel-polish'
const WHAT_SETS_US_APART_MEDIA = '/gelitup-media/blog/what-makes-us-different'
const BIAB_COMPARISON_MEDIA = '/gelitup-media/blog/biab-vs-builder-gel-vs-polygel'

const SUPPLIER_CHECKLIST_MEDIA = '/gelitup-media/blog/wholesale-gel-polish-supplier-checklist'

const SHOP = 'https://shop.gelitup.com'

export const blogPosts = [
  {
    slug: 'wholesale-gel-polish-supplier-checklist',
    category: 'Buying & business',
    title: "How to Choose a Wholesale Gel Polish Supplier in the EU: A Buyer's Checklist for Salons and Resellers",
    shortTitle: 'How to Choose a Wholesale Gel Polish Supplier in the EU',
    excerpt: 'A 10-point checklist to verify compliance, ingredients, terms and support before you place your first wholesale gel polish order in the EU.',
    metaTitle: 'Wholesale Gel Polish Supplier Checklist for the EU | GEL.IT.UP',
    metaDescription: 'Buying wholesale gel polish in the EU? Use this 10-point checklist to verify compliance, ingredients, terms and support before you place your first order.',
    // Goes live automatically at 00:00 Athens time on this date (see isPostLive below).
    publishedAt: '2026-11-09',
    publishedLabel: '9 November 2026',
    readTime: '7 min read',
    heroImage: `${SUPPLIER_CHECKLIST_MEDIA}/hero.jpg`,
    heroAlt: 'Wholesale gel polish supplier checklist for salons and resellers in the EU',
    calloutImage: `${SUPPLIER_CHECKLIST_MEDIA}/hero.jpg`,
    calloutAfterSection: -1, // same image as the header, so no mid-article repeat
    closingImage: `${SUPPLIER_CHECKLIST_MEDIA}/hero.jpg`,
    closingAlt: 'Apply for a GEL.IT.UP trade account for salons, academies and resellers.',
    ctaLabel: 'Apply for a GEL.IT.UP® trade account — gelitup.com',
    ctaUrl: 'https://gelitup.com/wholesale',
    tags: ['Wholesale', 'EU Compliance', 'Buyer Checklist'],
    intro: [
      'Your supplier decides what goes on your clients’ hands. It also decides your margins, your stock levels and your reputation.',
      'Pick well and you get consistent product, clean paperwork and a partner who answers the phone. Pick badly and you inherit compliance risk, patchy batches and delayed orders.',
      'This checklist covers what to verify before you order wholesale gel polish in the EU. Use it for every new supplier, and re-run it on the ones you already have.',
    ],
    sections: [
      {
        title: '1. EC 1223/2009 compliance and CPNP notification',
        paragraphs: [
          'Gel polish sold in the EU is a cosmetic product. That means it must comply with Regulation (EC) No 1223/2009.',
          'Ask the supplier:',
        ],
        bullets: [
          'Is every product notified on the CPNP (Cosmetic Products Notification Portal)?',
          'Is there a Responsible Person established in the EU?',
          'Can they supply the safety documentation on request?',
        ],
        after: [
          'A supplier who hesitates on any of these is a risk to your business. Responsible Persons carry legal duties. If you resell, you carry some of them too.',
        ],
      },
      {
        title: '2. Full INCI lists for every SKU',
        paragraphs: [
          'Not one hero product. Every SKU.',
          'A professional supplier publishes the full ingredient list for each polish, base coat, top coat and builder gel. If you have to chase for them, treat that as a warning sign.',
          'Why it matters: your clients ask what is in the bottle. So do your insurers. For a deeper look at reading labels, see our guide on [Why Ingredient Labels Matter More Than Ever](/blog/why-ingredient-labels-matter).',
        ],
      },
      {
        title: '3. HEMA and TPO status across the whole system',
        paragraphs: [
          'Many brands advertise one “free” polish and quietly leave HEMA or TPO in the base, top coat or builder.',
          'Check the entire system:',
        ],
        bullets: [
          'Colour gels',
          'Base and top coats',
          'Builder gels and extension products',
        ],
        after: [
          'Mixed systems create mixed risk. Sensitisation builds up across every layer a client wears, not just the colour. Read the ingredient list of each product you plan to layer, including builders and specialist gels.',
          'New to the terminology? Start with [What is HEMA in Gel Polish?](/blog/what-is-hema-in-gel-polish) and [What is TPO in Gel Nails?](/blog/what-is-tpo-in-gel-nails).',
        ],
        takeaway: 'Worth knowing: TPO-free formulations cure more slowly. GEL.IT.UP® gel polish cures in 60–90 seconds per coat under a 48W UV/LED lamp. That is the trade-off for cleaner chemistry, and it is one your techs can plan around.',
      },
      {
        title: '4. Cruelty-free: check who approves it, and the scope',
        paragraphs: [
          '“Cruelty-free” on a label is a claim. Independent approval is proof.',
          'Ask who approves it, and what it covers. Some marks cover only the finished product. Cruelty Free International’s approval covers the supply chain, from raw materials to finished product.',
          'GEL.IT.UP® is Approved by Cruelty Free International.',
        ],
      },
      {
        title: '5. Professional vetting for trade accounts',
        paragraphs: [
          'Does the supplier check who is buying at trade prices?',
          'Platforms that give trade pricing to anyone sell the same product to hobbyists and discounters. That undercuts the professionals who depend on trade pricing and trade support.',
          'Vetted trade access protects your market. It also signals a supplier that takes training, safety and product handling seriously. GEL.IT.UP® trade accounts are for nail technicians, salons, academies and resellers: you apply, we review, and approved accounts get trade pricing.',
        ],
      },
      {
        title: '6. Minimum order terms',
        paragraphs: ['Read the terms before you fall for the headline price.'],
        bullets: [
          'Is there a minimum order value or quantity?',
          'Are there hidden restocking or account fees?',
          'Can you test with a small first order?',
        ],
        after: [
          'No minimum order lets a new salon trial a range and lets a reseller scale up gradually. GEL.IT.UP® has no minimum order.',
        ],
      },
      {
        title: '7. Shipping and delivery',
        paragraphs: ['Check three things:'],
        bullets: [
          '**Cost.** What does delivery cost to your country, and from what order value is it free?',
          '**Speed.** What are the realistic dispatch and delivery times to your country?',
          '**Tracking.** Do you get it, and who handles problems?',
        ],
        after: [
          'GEL.IT.UP® orders are shipped from the EU, with clear delivery rates per country and free delivery above a set order value.',
        ],
      },
      {
        title: '8. Support quality',
        paragraphs: [
          'Test it before you buy. Send a question about a product and time the reply.',
          'Good wholesale support means a real person, on the channels you already use. You want answers on ingredients, compatibility and order issues without a ticket queue.',
          'GEL.IT.UP® offers genuine one-to-one support on WhatsApp and Viber.',
        ],
      },
      {
        title: '9. Batch consistency',
        paragraphs: [
          'A shade that changes between orders costs you rebooked clients and wasted time.',
          'Ask how the supplier manufactures and checks product. GMP (Good Manufacturing Practice) standards are the baseline to look for. GEL.IT.UP® is manufactured to global GMP standards.',
          'Then test it yourself. Order the same shade twice, a few weeks apart, and compare.',
        ],
      },
      {
        title: '10. Shade range and system depth',
        paragraphs: ['A wide range lets you serve every client from one supplier. Look for depth in:'],
        bullets: [
          'Core colour families',
          'Builder and extension systems',
          'Nail art products',
        ],
        after: [
          'GEL.IT.UP® carries 1,000+ shades, plus builder gels, polygels and nail art supplies.',
        ],
      },
      {
        title: 'Quick checklist',
        table: {
          head: ['Check', 'What good looks like'],
          rows: [
            ['EC 1223/2009 and CPNP', 'Notified, with a named EU Responsible Person'],
            ['INCI lists', 'Published for every SKU'],
            ['HEMA/TPO', 'Clearly stated for every product layer'],
            ['Cruelty-free', 'Independently approved, with clear scope'],
            ['Trade accounts', 'Buyers are vetted'],
            ['Minimum order', 'None, or clearly stated'],
            ['Shipping', 'Transparent cost and tracking'],
            ['Support', 'Fast, human, on WhatsApp or Viber'],
            ['Batch consistency', 'GMP manufacturing'],
            ['Shade range', 'Deep and current'],
          ],
        },
      },
      {
        title: 'Where GEL.IT.UP® fits',
        paragraphs: [
          'We built GEL.IT.UP® by GIUP® around this checklist. Founded in 2011, we are EU compliant under EC 1223/2009 and Approved by Cruelty Free International. Our gel polish is HEMA-free and TPO-free, and every product lists its full ingredients so you can check each layer. Trade accounts are vetted, there is no minimum order, and orders are shipped from the EU.',
          'Do not take our word for it. Hold us to the same checklist as everyone else. For more on how we work, read [What Sets GEL.IT.UP® Apart](/blog/what-sets-gelitup-apart).',
        ],
      },
    ],
    faqs: [
      {
        q: 'What should I check before buying wholesale gel polish in the EU?',
        a: 'Check EC 1223/2009 compliance, CPNP notification, full INCI lists per SKU, HEMA and TPO status across the system, the scope of any cruelty-free approval, minimum order terms, shipping, support and batch consistency.',
      },
      {
        q: 'How do I know if a gel polish supplier is EU compliant?',
        a: 'Ask for proof that products are notified on the CPNP and that a Responsible Person is established in the EU. A compliant supplier provides this without delay.',
      },
      {
        q: 'Is independent cruelty-free approval better than a "cruelty-free" label?',
        a: 'Yes. Independent approval, such as Cruelty Free International’s, is checked by a third party and has a defined scope. A self-declared label carries no such verification.',
      },
      {
        q: 'Do wholesale nail suppliers require a minimum order?',
        a: 'Many do. Some set value or quantity thresholds. GEL.IT.UP® has no minimum order, so you can start small and scale up.',
      },
    ],
    verdict: {
      title: 'Ready to check us against the list?',
      paragraphs: [
        'Apply for a GEL.IT.UP® trade account on gelitup.com. Once your account is approved, you get trade pricing on the full range.',
      ],
    },
  },
  {
    slug: 'biab-vs-builder-gel-vs-polygel',
    category: 'Product guides',
    title: 'BIAB vs Builder Gel vs Polygel: Which Should Your Salon Offer?',
    shortTitle: 'BIAB vs Builder Gel vs Polygel',
    excerpt: 'An honest comparison of BIAB, builder gel and polygel: strength, skill level, handling and removal, so you can decide which system suits your salon.',
    metaTitle: 'BIAB vs Builder Gel vs Polygel: Which Should Your Salon Offer?',
    metaDescription: "BIAB vs polygel vs builder gel: compare strength, skill level, handling and removal to decide which system suits your salon and your clients' nail types.",
    // Goes live automatically at 00:00 Athens time on this date (see isPostLive below).
    publishedAt: '2026-10-26',
    publishedLabel: '26 October 2026',
    readTime: '6 min read',
    heroImage: `${BIAB_COMPARISON_MEDIA}/hero.jpg`,
    heroAlt: 'Which product? BIAB vs builder gel vs polygel – GEL.IT.UP MultiMix Synthogel tubes and builder gel pots',
    calloutImage: `${BIAB_COMPARISON_MEDIA}/hero.jpg`,
    calloutAlt: 'BIAB, builder gel or polygel: choose the system that matches your clients and your team.',
    calloutAfterSection: -1, // same image as the header, so no mid-article repeat
    closingImage: `${BIAB_COMPARISON_MEDIA}/hero.jpg`,
    closingAlt: 'Explore GEL.IT.UP Brush on Builder (BIAB), 3-in-1 Builder Gels and MultiMix Synthogel.',
    ctaLabel: 'Shop GEL.IT.UP® professional nail supplies — shop.gelitup.com',
    ctaUrl: `${SHOP}/pages/ourproducts`,
    tags: ['BIAB', 'Builder Gel', 'Polygel'],
    intro: [
      'Three products dominate strong-nail services right now: BIAB, builder gel in a pot, and polygel. They overlap, and they get confused constantly.',
      'Pick the wrong one and you lose time, product and clients. Pick the right one and you build a service menu that runs smoothly.',
      'Here is an honest comparison for nail professionals. No hype.',
    ],
    sections: [
      {
        title: 'What is each product?',
        groups: [
          {
            title: 'BIAB (brush on builder gel)',
            paragraphs: [
              'BIAB stands for Builder In A Bottle. It is a builder gel in a bottle with a brush, applied like a thick polish. It is built for strengthening and structure on the natural nail.',
              `GEL.IT.UP® range: [Brush on Builder - BIAB](${SHOP}/collections/brush-on-builder-biab).`,
            ],
          },
          {
            title: 'Builder gel (pot or tube)',
            paragraphs: [
              'A traditional soak-off builder gel, usually thicker and more controllable than a bottle product. Techs use it for overlays, apex building and extensions over tips or forms.',
              `GEL.IT.UP® range: [3-in-1 Builder Gels](${SHOP}/collections/3-in-1-builder-system).`,
            ],
          },
          {
            title: 'Polygel',
            paragraphs: [
              'A hybrid of acrylic and gel. It is a putty-like paste you shape, usually with a slip solution, then cure under a lamp. It is built for extensions and sculpting.',
              `GEL.IT.UP® range: [MultiMix Synthogel](${SHOP}/collections/polygel).`,
            ],
          },
        ],
      },
      {
        title: 'BIAB: strengths and limits',
        groups: [
          {
            title: 'Strengths',
            bullets: [
              'Fast application, with minimal handling',
              'Self-levelling feel suits a quick overlay',
              'Easy to learn for techs moving up from gel polish',
              'Good for clients who want strength without length',
            ],
          },
          {
            title: 'Limits',
            bullets: [
              'Less suited to major length or sculpting',
              'Needs careful application at the cuticle and sidewalls to avoid flooding',
              'Not the first choice for structured extensions',
            ],
          },
        ],
        takeaway: 'Best for: natural nail overlays, growing out natural nails, and maintaining shorter clients.',
      },
      {
        title: 'Builder gel: strengths and limits',
        groups: [
          {
            title: 'Strengths',
            bullets: [
              'Good control over apex and structure',
              'Versatile across overlays, extensions and repairs',
              'Works well over tips or forms',
              'A solid core product for a busy salon',
            ],
          },
          {
            title: 'Limits',
            bullets: [
              'A steeper learning curve than BIAB',
              'Takes practice to place and shape cleanly',
              'Pot handling needs good hygiene discipline',
            ],
          },
        ],
        takeaway: 'Best for: overlays that need structure, extensions, and repairing broken nails.',
      },
      {
        title: 'Polygel: strengths and limits',
        groups: [
          {
            title: 'Strengths',
            bullets: [
              'Sculpting freedom, because you can shape and move the product',
              'Strong choice for length and shape work',
              'Familiar to techs with acrylic experience',
            ],
          },
          {
            title: 'Limits',
            bullets: [
              'Slip solution and tool technique add a learning step',
              'Product can be inconsistent in the hands of a beginner',
              'Needs good tool care and clean-up discipline',
            ],
          },
        ],
        takeaway: 'Best for: extensions, shaping, and clients who want sculpted length.',
      },
      {
        title: 'Skill level and learning curve',
        table: {
          head: ['Skill level', 'Best starting point'],
          rows: [
            ['Newer tech, gel polish background', 'BIAB'],
            ['Intermediate, comfortable with structure', 'Builder gel'],
            ['Experienced, comfortable sculpting', 'Polygel'],
          ],
        },
        after: [
          'Start with what your team can do consistently. A confident tech with one system beats a nervous tech with three.',
        ],
      },
      {
        title: 'Product handling',
        bullets: [
          '**BIAB:** brush application. Watch the product near skin and cuticles.',
          '**Builder gel:** scoop or squeeze, then place and shape with a brush. Keep tools clean and pots closed.',
          '**Polygel:** apply with a brush or tool, using slip solution to shape. Work in small sections so the product does not move before curing.',
        ],
        paragraphs: [
          "Whatever you choose, follow the manufacturer's instructions for prep, application and curing. Lamp compatibility and cure times vary by product, so check each product's guidance rather than assuming. For what to look for on the label, see [Why Ingredient Labels Matter More Than Ever](/blog/why-ingredient-labels-matter).",
        ],
      },
      {
        title: 'Removal',
        paragraphs: [
          'Removal method differs by product. Always check the individual product guidance before you promise a removal method to a client.',
          'Good removal protects the natural nail. Rushed removal damages it, whatever system you use. Allow enough appointment time and never peel or force product off.',
        ],
      },
      {
        title: 'Quick comparison table',
        table: {
          head: ['', 'BIAB', 'Builder gel', 'Polygel'],
          rows: [
            ['Format', 'Bottle with brush', 'Pot or tube', 'Paste (tube)'],
            ['Best use', 'Natural nail overlays', 'Overlays, extensions, repairs', 'Extensions and sculpting'],
            ['Learning curve', 'Lowest', 'Medium', 'Highest'],
            ['Speed of application', 'Fastest', 'Medium', 'Slower'],
            ['Length work', 'Limited', 'Good', 'Excellent'],
            ['Handling', 'Simple', 'Moderate', 'Technique-dependent'],
            ['GEL.IT.UP® range', 'Brush on Builder - BIAB', '3-in-1 Builder Gels', 'MultiMix Synthogel'],
          ],
        },
      },
      {
        title: 'Which should your salon offer?',
        paragraphs: ['Use your client base as the guide.'],
        bullets: [
          '**Mostly natural nail clients:** start with BIAB.',
          '**A mix of overlays and extensions:** add builder gel.',
          '**Clients asking for length and shape:** add polygel.',
        ],
        after: [
          'Most busy salons end up offering two. Many offer all three, with each tech specialising.',
          'Whichever you choose, product quality matters. The GEL.IT.UP® Brush on Builder, 3-in-1 Builder Gels and MultiMix Synthogel are HEMA-free and TPO-free, EU compliant under EC 1223/2009, and manufactured to GMP standards. That cleaner chemistry protects your clients and your reputation. For the reasoning, read [What is HEMA in Gel Polish?](/blog/what-is-hema-in-gel-polish) and [What is TPO in Gel Nails?](/blog/what-is-tpo-in-gel-nails).',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is the difference between BIAB and builder gel?',
        a: 'BIAB is a builder gel supplied in a bottle with a brush, so it applies like a polish. Traditional builder gel comes in a pot or tube and gives more control for building structure and length.',
      },
      {
        q: 'Is polygel stronger than builder gel?',
        a: 'Strength depends on the product, the application and the nail prep, not the category alone. Polygel suits sculpting and length. Builder gel suits structured overlays. Choose by use case.',
      },
      {
        q: 'What is the best builder gel for salons?',
        a: 'The best choice is the one your techs can apply consistently, that suits your service menu and is professionally formulated. Many salons use BIAB for overlays and builder gel for extensions.',
      },
      {
        q: 'Can beginners use polygel?',
        a: 'They can, but polygel usually has the steepest learning curve. Slip solution, tool technique and timing take practice. BIAB is generally the easiest place to start.',
      },
    ],
    verdict: {
      title: 'Build your strong-nail menu',
      paragraphs: [
        'See the full range of builder gels, BIAB and MultiMix Synthogel, with no minimum order, on the GEL.IT.UP® shop.',
        'Want to know what makes the range different? Read [What Sets GEL.IT.UP® Apart](/blog/what-sets-gelitup-apart).',
      ],
    },
  },
  {
    slug: 'what-is-hema-in-gel-polish',
    category: 'Ingredients & compliance',
    title: 'What is HEMA in Gel Polish? A Guide for Nail Professionals',
    shortTitle: 'What is HEMA in Gel Polish?',
    excerpt: 'Learn what HEMA is, why sensitisation matters, and how salons can move toward safer HEMA-free gel systems.',
    metaTitle: 'What is HEMA in Gel Polish? | HEMA-Free Guide for Salons',
    metaDescription: 'Learn what HEMA is in gel polish, how sensitisation develops, and why HEMA-free systems matter for nail professionals.',
    publishedAt: '2026-09-22',
    publishedLabel: '22 September 2026',
    readTime: '6 min read',
    heroImage: `${HEMA_GUIDE_MEDIA}/hema-guide-blog-header.png`,
    calloutImage: `${HEMA_GUIDE_MEDIA}/hema-guide-blog-header.png`,
    calloutAlt: 'A HEMA-free system helps salons reduce sensitisation risk and protect clients.',
    calloutAfterSection: 2,
    closingImage: `${HEMA_GUIDE_MEDIA}/hema-guide-blog-header.png`,
    closingAlt: 'Browse the GEL.IT.UP HEMA-free professional range.',
    tags: ['HEMA-Free', 'Salon Safety', 'Ingredient Guide'],
    intro: [
      'HEMA is one of the most common ingredients used in gel polish systems, but it is also one of the most important for nail professionals to understand. It helps gel adhere, but repeated skin contact with uncured product can create real sensitisation risk.',
      'This guide explains what HEMA is, how sensitisation develops, why the risk matters for salons and clients, and how to read product labels with more confidence.',
    ],
    sections: [
      {
        title: 'What is HEMA?',
        paragraphs: [
          'HEMA stands for 2-Hydroxyethyl Methacrylate. It is a methacrylate monomer used in UV and LED-cured nail products to improve adhesion and durability.',
          'That makes it useful in gel systems, but it also means professionals need to understand how it behaves when it touches the skin before curing is complete.',
        ],
      },
      {
        title: 'How HEMA sensitisation develops',
        paragraphs: [
          'When liquid or under-cured HEMA touches the skin around the nail, the cuticle, or the fingertips, it can penetrate the skin barrier and trigger an immune response.',
          'At first, there may be no obvious reaction. Later exposures can produce redness, itching, swelling, blistering, or dermatitis around the nails.',
        ],
        takeaway: 'The key risk is skin contact with uncured product. Good application control and full curing matter just as much as the formulation itself.',
      },
      {
        title: 'What HEMA-free gel polish means',
        paragraphs: [
          'HEMA-free means the full product system is formulated without HEMA — not just the base coat, but also the colour, builder, and top coat where relevant.',
          'A complete HEMA-free system reduces sensitisation risk and gives salons a clearer standard to work from when choosing products for professional services.',
        ],
      },
      {
        title: 'How to check ingredient labels',
        paragraphs: [
          'On packaging or technical documents, HEMA may appear as 2-Hydroxyethyl Methacrylate or Hydroxyethyl Methacrylate. If either appears in the list, the product is not HEMA-free.',
          'Ask suppliers for full INCI lists and verify every SKU in the system, not just the hero product on the front label.',
        ],
      },
    ],
    verdict: {
      title: 'The takeaway',
      paragraphs: [
        'HEMA is a useful ingredient, but it comes with a real sensitisation risk when application control is poor or curing is incomplete. For salons, the safer long-term answer is to understand the ingredient, use better labels and documentation, and move toward complete HEMA-free systems where possible.',
      ],
    },
  },
  {
    slug: 'what-is-tpo-in-gel-nails',
    category: 'Ingredients & compliance',
    title: 'What is TPO in Gel Nails? Why It’s Being Removed from Professional Formulas',
    shortTitle: 'What is TPO in Gel Nails?',
    excerpt: 'Learn what TPO is, why it is under EU regulatory pressure, and why more professional nail brands are removing it from gel systems.',
    metaTitle: 'What Is TPO in Gel Nails? Why Professional Brands Are Removing It',
    metaDescription: 'Understand TPO in gel polish, why it is drawing EU scrutiny, and why professional nail brands are switching to safer, TPO-free formulas.',
    publishedAt: '2026-09-24',
    publishedLabel: '24 September 2026',
    readTime: '6 min read',
    heroImage: `${TPO_GUIDE_MEDIA}/hero.jpg`,
    calloutImage: `${TPO_GUIDE_MEDIA}/hero.jpg`,
    calloutAlt: 'TPO-free formulations are becoming the new standard for professional nail services.',
    closingImage: `${TPO_GUIDE_MEDIA}/hero.jpg`,
    closingAlt: 'Explore the GEL.IT.UP TPO-free, HEMA-free and CPNP-notified range.',
    ctaLabel: 'Explore the Full Catalogue — gelitup.com',
    ctaUrl: 'https://shop.gelitup.com/pages/ourproducts',
    tags: ['TPO-Free', 'HEMA-Free', 'EU Compliant'],
    intro: [
      'Until recently, most nail professionals had never heard of TPO. That is changing fast.',
      'Trimethylbenzoyl Diphenylphosphine Oxide — TPO — is one of the photoinitiators responsible for curing gel polish under UV and LED lamps. It has been a standard component of gel nail formulations for years, but it is now under growing regulatory attention in the EU and a reformulation wave among professional brands.',
      'This guide explains what TPO is, why the concerns are growing, what the EU regulatory position looks like, and what “TPO-free” meaningfully means for professional practice.',
    ],
    sections: [
      {
        title: 'What Is TPO?',
        paragraphs: [
          'TPO stands for Trimethylbenzoyl Diphenylphosphine Oxide. Its full INCI name is Diphenyl(2,4,6-trimethylbenzoyl)phosphine oxide. It belongs to the acylphosphine oxide class of photoinitiators.',
          'Its function in gel nail products is to initiate polymerisation. When UV or LED light hits a TPO molecule, it absorbs the energy and generates reactive free radicals. Those radicals trigger the curing reaction that transforms the gel from a liquid monomer system into a solid, cross-linked polymer.',
          'TPO is particularly efficient under LED lamps, which is part of the reason it became so common as the industry moved from UV to LED curing systems. From a pure formulation-performance standpoint, TPO works. The question is what else it does.',
        ],
      },
      {
        title: 'Why TPO Is Being Removed from Professional Formulas',
        paragraphs: [
          'The primary documented concern with TPO is photoallergy and skin sensitisation. Photoallergy is a specific immune-mediated reaction that occurs when a sensitising molecule requires UV or visible light exposure to trigger a response. In practical terms, skin contact with a TPO-containing product followed by UV or LED light exposure during curing can sensitise a person. Once sensitised, later exposure often triggers an allergic reaction.',
          'TPO has also been identified as a contact sensitiser independent of photoactivation, although the photoallergic pathway remains the main concern in gel nail settings. The combination of skin contact during application, proximity to the light source and repeated service appointments creates a serious sensitisation profile for professionals and clients alike.',
        ],
        takeaway: 'The deeper issue is not just a single service. It is repeated workday exposure, repeated sensitisation and the cumulative burden that builds across a salon team and client base.',
      },
      {
        title: 'The EU Regulatory Position',
        paragraphs: [
          'The EU’s Scientific Committee on Consumer Safety (SCCS) has assessed photoinitiators used in nail products, including acylphosphine oxide compounds in the TPO family. The direction of those assessments, combined with the EU Cosmetics Regulation’s precautionary approach to skin sensitizers, has placed TPO on a regulatory trajectory toward restriction or removal from cosmetic products.',
          'Under EU Cosmetics Regulation (EC) No 1223/2009, substances identified as skin sensitizers or posing unacceptable risk can be added to Annex II or Annex III. Professional brands formulating for the EU market that tracked SCCS opinions had advance notice that TPO’s regulatory status was under active review. Those that reformulated early are now positioned on the right side of the compliance curve.',
        ],
      },
      {
        title: 'What TPO-Free Means for Professional Practice',
        paragraphs: [
          'Removing TPO is not a compromise in quality when the formulation is well balanced. A TPO-free gel that is designed for standard LED lamps can still cure completely, maintain durability and deliver the same professional finish clients expect.',
          'It creates a safety advantage for clients, a lower occupational risk for technicians and a stronger long-term future-proof position for salons and distributors. A product that is TPO-free, HEMA-free and CPNP-notified gives you a clear answer when a client asks what is in the formula and why it is safer.',
        ],
        takeaway: 'For a professional product range, ingredient transparency is no longer a premium feature. It is a minimum baseline for trust and risk management.',
      },
      {
        title: 'What to Look For When Switching to TPO-Free',
        paragraphs: [
          'Not every “TPO-free” claim is equally verifiable. Ask for the CPNP notification reference, confirm the full INCI declaration and check that the ingredient list is genuinely free from TPO and related acylphosphine oxide photoinitiators.',
          'If a supplier is vague, treat that as a no. A product range that can confidently explain its photoinitiator package, confirm EU compliance and show visible manufacturing standards is the one worth building your service menu around.',
        ],
      },
      {
        title: 'The Combined Risk of HEMA and TPO',
        paragraphs: [
          'HEMA and TPO are separate molecules with separate sensitisation pathways, but they frequently appear together in standard gel systems. A formula that removes HEMA but retains TPO still leaves a sensitisation risk in place. A formula that removes TPO but retains HEMA still leaves a different one. The professional standard is increasingly both-free.',
          'Acts of reformulation are no longer a niche innovation. They are the market response to where science and European regulation are converging. The brands that move first are not simply “ahead of the trend”; they are lower-risk, more trusted and easier to defend in a compliance-conscious market.',
        ],
      },
    ],
    verdict: {
      title: 'The Bottom Line',
      paragraphs: [
        'TPO is not a minor ingredient detail. It is one of the core photoinitiators in many conventional gel systems, and it is now being revisited through the lens of occupational health, client safety and EU compliance.',
        'A salon selecting TPO-free, HEMA-free and CPNP-notified products is choosing a safer, more resilient, more future-proof formulation strategy. That is the direction professional nail services are moving in.',
      ],
    },
  },
  {
    slug: 'what-sets-gelitup-apart',
    category: 'Brand Standards & Ethics',
    title: 'What Sets GEL.IT.UP Apart: The Standard Every Professional Nail Brand Should Be Held To',
    shortTitle: 'What sets GEL.IT.UP apart?',
    excerpt: 'Why professionals choose GEL.IT.UP: professional-only access, HEMA-free and TPO-free formulas, approval by Cruelty Free International, and direct 1-on-1 support.',
    metaTitle: 'What Sets GEL.IT.UP Apart | Professional Nail Brand Standards',
    metaDescription: 'Discover what makes GEL.IT.UP the professional nail brand of choice: cruelty-free standards (Approved by Cruelty Free International), safer formulations, compliance, and genuine support.',
    publishedAt: '2026-09-23',
    publishedLabel: '23 September 2026',
    readTime: '7 min read',
    heroImage: `${WHAT_SETS_US_APART_MEDIA}/hero.jpg`,
    calloutImage: `${WHAT_SETS_US_APART_MEDIA}/hero.jpg`,
    calloutAlt: 'What sets GEL.IT.UP apart: standards, ethics, and professional support.',
    calloutAfterSection: 2,
    closingImage: `${WHAT_SETS_US_APART_MEDIA}/hero.jpg`,
    closingAlt: 'Explore GEL.IT.UP professional products built to higher standards.',
    ctaLabel: 'Explore the Full Catalogue — shop.gelitup.com',
    ctaUrl: 'https://shop.gelitup.com/pages/ourproducts',
    tags: ['Professional-Only', 'HEMA-Free', 'TPO-Free', 'Cruelty Free International'],
    intro: [
      'There are thousands of gel polish brands on the market, but very few are built exclusively around professional standards from top to bottom.',
      'This guide explains what makes GEL.IT.UP different in real operational terms: formulation policy, certification scope, support model, and distributor practice.',
    ],
    sections: [
      {
        title: 'A Professional-Only Brand by Design',
        paragraphs: [
          'GEL.IT.UP sells to nail technicians, salons, academies, and resellers only. This protects professional credibility and keeps product use aligned with trained application and curing standards.',
          'Rather than mixing consumer and pro positioning, the system is designed for professional workflows from formulation to documentation.',
        ],
      },
      {
        title: '1,000+ Shades Under One Safety Standard',
        paragraphs: [
          'A large catalogue only matters if quality is consistent across every SKU. GEL.IT.UP maintains one compliance baseline across the full range.',
          'Products are formulated HEMA-free and TPO-free, aligned with EU requirements, and manufactured under GMP-oriented quality controls.',
        ],
        takeaway: 'Consistency across base, colour, builder, and top layers is what makes a system reliably professional.',
      },
      {
        title: 'Approved by Cruelty Free International, Across the Supply Chain',
        paragraphs: [
          'GEL.IT.UP is Approved by Cruelty Free International. The approval is not just a final-label claim: it extends through ingredient sourcing and manufacturing pathways.',
          'For salons and distributors, this gives independently verified evidence of cruelty-free practice rather than marketing-only language.',
        ],
      },
      {
        title: 'Commercial Terms and Support That Fit Real Salons',
        paragraphs: [
          'No minimum order and straightforward access terms make stocking practical for both solo technicians and larger academy or reseller operations.',
          'Support is delivered through direct channels, enabling faster answers for day-to-day technical or product questions.',
        ],
      },
      {
        title: 'Long-Term Reliability for Professionals',
        paragraphs: [
          'Founded in 2011, GEL.IT.UP has built a multi-country professional network by pairing formulation quality with compliance discipline.',
          'For professionals, that means clearer product decisions, better risk control, and stronger client confidence over time.',
        ],
      },
    ],
    verdict: {
      title: 'The Standard Worth Expecting',
      paragraphs: [
        'Professional-only access, safer ingredient policy, verified ethics, and real support should be baseline expectations from any serious nail supplier.',
        'GEL.IT.UP is built around those standards as an operating model, not as occasional campaign messaging.',
      ],
    },
  },
  {
    slug: 'why-ingredient-labels-matter',
    category: 'Ingredients & compliance',
    title: 'Why Ingredient Labels Matter More Than Ever',
    shortTitle: 'Why Ingredient Labels Matter More Than Ever',
    featured: true,
    excerpt: 'Understand HEMA, TPO and the ingredient-label checks every nail technician, salon and distributor should make before choosing a gel system.',
    metaTitle: 'Why Gel Polish Ingredient Labels Matter | HEMA & TPO Guide',
    metaDescription: 'Learn what HEMA and TPO are, why ingredient labels matter, and how nail professionals can evaluate safer, compliant gel polish formulations.',
    publishedAt: '2026-08-26',
    publishedLabel: '26 August 2026',
    readTime: '7 min read',
    heroImage: `${INGREDIENT_LABELS_MEDIA}/hero.jpg`,
    calloutImage: `${INGREDIENT_LABELS_MEDIA}/callout.webp`,
    calloutAlt: 'Ingredient transparency is the foundation of safer, compliant professional nail services.',
    calloutAfterSection: 3,
    closingImage: `${INGREDIENT_LABELS_MEDIA}/closing-cta.webp`,
    closingAlt: 'Choose HEMA-free, TPO-free and silver-free professional nail products from GEL.IT.UP.',
    ctaLabel: 'Explore the Full Catalogue — gelitup.com',
    ctaUrl: 'https://shop.gelitup.com/pages/ourproducts',
    tags: ['HEMA-Free', 'TPO-Free', 'Silver-Free'],
    intro: [
      'Walk into any professional nail salon in Europe today, and you will hear the same two acronyms: HEMA and TPO. These monomers have become the central topic in gel chemistry discussions, regulatory checklists, and manufacturer reformulation roadmaps. For nail technicians and salon owners who stock their own product library, understanding what these ingredients are — and why an increasing number of professional brands are removing them — is no longer optional. It is a compliance requirement, a client safety decision, and a business differentiator.',
      'This guide covers what HEMA and TPO are, why they are under regulatory scrutiny, and how to evaluate gel polish formulations when sourcing for your studio or distribution network.',
    ],
    sections: [
      {
        title: 'What Are HEMA and TPO?',
        paragraphs: [
          'HEMA (hydroxyethyl methacrylate) is a methacrylate monomer commonly used in gel and acrylic nail products as a cross-linking agent. It helps the product adhere to the natural nail plate and creates the hard, durable finish that gel systems are known for.',
          'TPO (trimethylbenzoyldiphenylphosphine oxide) is a photoinitiator — the chemical that triggers the curing reaction when gel polish is exposed to UV or LED light. Without photoinitiators, gel would never harden under the lamp.',
          'Both chemicals are effective. Both have been standard in professional nail products for years. And both are now the subject of tightening EU Cosmetics Regulation (EC) No. 1223/2009 compliance standards, driven by a growing body of dermatological data on allergen sensitisation.',
        ],
      },
      {
        title: 'The Regulatory Shift: Why HEMA and TPO Are Being Phased Out',
        paragraphs: [
          'The European Union’s Scientific Committee on Consumer Safety (SCCS) has classified HEMA as a sensitiser, meaning repeated skin contact can lead to allergic contact dermatitis. Once sensitised, a technician or client may react not only to HEMA but also to cross-reacting methacrylates found in dental and medical adhesives.',
          'TPO has followed a similar trajectory. While less potent as a sensitiser than HEMA, TPO photoinitiators have been flagged under EU classification, labelling, and packaging regulations for skin sensitisation Category 1B. Several EU member states now restrict TPO concentrations in leave-on cosmetic products, and the broader trend points toward eventual restriction in professional nail categories.',
        ],
        takeaway: 'What this means in practice: a growing number of distributors, salon chains, and individual studios now require CPNP-notified, HEMA-free and TPO-free declarations on every product they stock.',
      },
      {
        title: 'What HEMA-Free and TPO-Free Actually Mean for Performance',
        paragraphs: [
          'A common concern among nail professionals is that removing HEMA and TPO will compromise adhesion, durability, or curing speed. In early-generation formulations, that concern had some merit. But the chemistry has moved on.',
          'Modern HEMA-free, TPO-free gel systems achieve their cross-linking and photoinitiation through alternative monomer blends and photoinitiator packages. Properly balanced alternatives maintain strong adhesion, cure reliably under standard 48W UV/LED lamps, reduce sensitisation risk and avoid the yellowing that some TPO formulations develop over time.',
          'The trade-off is small: slightly longer cure times and a narrower margin for under-curing. As long as your lamp is powerful enough and you follow the manufacturer’s cure schedule, the result is just as durable.',
        ],
      },
      {
        title: 'How to Read a Gel Polish Ingredient Label',
        paragraphs: [
          'HEMA: If listed anywhere in the ingredients, the product contains HEMA monomer. Avoid it for hypoallergenic or compliance-first stocking decisions.',
          'TPO: Look for trimethylbenzoyldiphenylphosphine oxide or CAS No. 75980-60-8. A TPO-free claim should be explicit on the packaging or technical data sheet.',
          'CPNP notification: Every cosmetic product sold in the EU must be registered in the Cosmetic Products Notification Portal. Ask the supplier for documentation confirming its notification.',
          'Silver (CI 77820): Some formulations that remove HEMA and TPO still use silver as an alternative sensitiser. A truly allergen-conscious formulation will also be silver-free.',
        ],
      },
      {
        title: 'GEL.IT.UP: A Case Study in Compliant Formulation',
        paragraphs: [
          'GEL.IT.UP by GIUP® formulates every product in its catalogue — from the Multimix Professional Builder Gel System and 3-IN-1 Builder Gel to Brush on Builder, 5-in-1 Superior Base Coat and all colour collections — as HEMA-free, TPO-free and Silver (CI 77820)-free.',
          'Each formulation is notified through the UK Submit Cosmetic Product Notification service and complies with EU Cosmetics Regulation standards. The brand’s entire 1,000+ shade library carries the same compliance baseline.',
          'For the professional nail technician, this means one compliance standard across every SKU, interchangeable layering without introducing sensitisers from another product layer, and consistent curing at 60–90 seconds under a 48W UV/LED lamp.',
        ],
      },
      {
        title: 'Building a Compliant Product Library',
        paragraphs: [
          'Request the Safety Data Sheet before the first order. Formulation data sheets are not trade secrets, and any compliant manufacturer should make them available.',
          'Verify CPNP or SCPN notification by requesting supporting documentation from the supplier.',
          'Test the cure time yourself. HEMA-free, TPO-free gel often requires the full recommended cure window, so test a small batch with your lamp before committing to a bulk order.',
          'Check for silver as a hidden sensitiser, and standardise on one compliance level across your entire product set. Mixing HEMA-free and standard products in the same service creates cross-contamination risk on brushes, files and during curing.',
        ],
      },
    ],
    verdict: {
      title: 'The Bottom Line',
      paragraphs: [
        'HEMA-free and TPO-free gel polish is not a downgrade in performance. It is an upgrade in safety, compliance, and professional credibility. For the salon owner, stocking compliant formulations removes a growing regulatory risk. For the distributor, it unlocks a wider sales channel across EU markets. And for the individual nail technician, it means less sensitisation risk over a career of daily application.',
        'GEL.IT.UP has built its entire product line around this principle. The HEMA-free, TPO-free and silver-free standard represents a formulation decision that puts technician safety and regulatory compliance on the same level as colour payoff and durability.',
      ],
    },
  },
]

// A post appears on the site from 00:00 Athens time (UTC+2 in winter) on its publishedAt date.
// Before that it is hidden from the blog list and its page shows "not found"
// (add ?preview=1 to the article URL to check it in advance).
export function isPostLive(post, now = Date.now()) {
  if (!post?.publishedAt) return true
  return now >= Date.parse(`${post.publishedAt}T00:00:00+02:00`)
}

export function getLivePosts(now = Date.now()) {
  return blogPosts.filter((post) => isPostLive(post, now))
}

export function getBlogPost(slug) {
  return blogPosts.find((post) => post.slug === slug)
}
