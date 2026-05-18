<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $guide['title'] }} — CarePath</title>
    <style>
        /* ─────────────────────────────────────────────────────────
           Canonical CarePath guide PDF — mirrors the magazine-style
           CarePathGuideTemplate from the web (mockup approved
           2026-05-17): cover page, table-of-contents page, then
           per-guide content. Same navy / teal / sage / cream palette
           and serif-heading rhythm.

           DomPDF can't load Google Fonts at runtime, so DejaVu Serif
           (bundled) is the Playfair fallback.
           ───────────────────────────────────────────────────────── */
        @page { margin: 0; }
        body {
            font-family: 'Helvetica', sans-serif;
            color: #1E3A5F;
            font-size: 11pt;
            line-height: 1.55;
            margin: 0;
            background: #FFFFFF;
        }

        /* ─── Page sections (full bleed) ─── */
        .page {
            width: 100%;
            page-break-after: always;
            position: relative;
        }
        .page:last-child { page-break-after: auto; }
        .pad { padding: 0.55in 0.6in; }

        /* ─── Brand strip header (cover + TOC + content) ─── */
        .brand-strip {
            display: table;
            width: 100%;
            border-collapse: collapse;
        }
        .brand-strip > div { display: table-cell; vertical-align: middle; }
        .brand-strip .logo {
            font-family: 'DejaVu Serif', Georgia, serif;
            font-size: 16pt;
            font-weight: bold;
            color: #1E3A5F;
            letter-spacing: -0.3pt;
            line-height: 1.1;
        }
        .brand-strip .tag {
            font-size: 8pt;
            color: #2A7F7F;
            text-transform: uppercase;
            letter-spacing: 1.2pt;
            margin-top: 2pt;
        }
        .brand-strip .right {
            text-align: right;
        }
        .pill {
            display: inline-block;
            background: #1E3A5F;
            color: #FFFFFF;
            border-radius: 999pt;
            padding: 6pt 14pt;
            font-size: 9pt;
            font-weight: bold;
            letter-spacing: 0.8pt;
            text-transform: uppercase;
        }
        .pill .arrow { color: #8FAF9F; margin-right: 4pt; }

        /* ─── COVER PAGE ─── */
        .cover-body {
            margin-top: 36pt;
        }
        .cover-title {
            font-family: 'DejaVu Serif', Georgia, serif;
            font-size: 38pt;
            font-weight: bold;
            color: #1E3A5F;
            line-height: 1.05;
            letter-spacing: -1pt;
            margin: 0;
        }
        .cover-rule {
            width: 60pt;
            height: 3pt;
            background: #2A7F7F;
            margin: 18pt 0 18pt 0;
            border: 0;
        }
        .cover-subtitle {
            font-size: 13pt;
            color: #4B5563;
            line-height: 1.5;
            max-width: 360pt;
        }

        /* Hero photo — dominant cover element, the way the mockup
           shows the older woman + caregiver on a couch. When a
           hero_image_url is supplied on the guide, we render the
           photo as a full-width image. When it isn't, we fall back
           to a sage gradient block with the eyebrow + title so the
           cover never looks empty. */
        .hero-photo {
            margin-top: 22pt;
            width: 100%;
            border-radius: 14pt;
            overflow: hidden;
            background: #8FAF9F;
        }
        .hero-photo img {
            display: block;
            width: 100%;
            height: 280pt;
            object-fit: cover;
            border-radius: 14pt;
        }
        .hero-block {
            margin-top: 22pt;
            background: #8FAF9F;
            border-radius: 14pt;
            padding: 26pt 24pt;
            color: #FFFFFF;
            min-height: 200pt;
        }
        .hero-block .eye {
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 1pt;
            font-weight: bold;
            color: #FFFFFF;
            opacity: 0.85;
        }
        .hero-block .htitle {
            font-family: 'DejaVu Serif', Georgia, serif;
            font-size: 22pt;
            font-weight: bold;
            margin-top: 6pt;
            line-height: 1.15;
        }

        /* Navy band at the bottom of the cover with value props
           and the URL. */
        .cover-band {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: #1E3A5F;
            color: #FFFFFF;
            padding: 24pt 0.6in 20pt 0.6in;
            border-top-left-radius: 36pt;
            border-top-right-radius: 36pt;
        }
        .cover-band table { width: 100%; border-collapse: collapse; }
        .cover-band td { vertical-align: top; padding: 0; }
        .cover-band .icon-cell {
            width: 50pt;
        }
        .icon-circle {
            display: inline-block;
            width: 44pt; height: 44pt;
            border-radius: 50%;
            background: rgba(255,255,255,0.10);
            border: 1.5px solid #2A7F7F;
            text-align: center;
            line-height: 44pt;
            font-size: 18pt;
            color: #8FAF9F;
            font-weight: bold;
        }
        .cover-band .summary {
            font-size: 10pt;
            line-height: 1.4;
            color: #FFFFFF;
            padding-right: 24pt;
        }
        .vp-list .vp {
            display: block;
            font-size: 10pt;
            color: #FFFFFF;
            padding: 4pt 0;
        }
        .vp-list .vp .check {
            display: inline-block;
            width: 16pt; height: 16pt;
            border-radius: 50%;
            background: #2A7F7F;
            color: #FFFFFF;
            font-weight: bold;
            text-align: center;
            line-height: 16pt;
            font-size: 10pt;
            margin-right: 8pt;
        }
        .cover-url {
            text-align: center;
            color: #8FAF9F;
            font-size: 9pt;
            letter-spacing: 0.6pt;
            margin-top: 18pt;
        }

        /* ─── TABLE OF CONTENTS PAGE ─── */
        .toc-title {
            font-family: 'DejaVu Serif', Georgia, serif;
            font-size: 36pt;
            font-weight: bold;
            color: #1E3A5F;
            line-height: 1.05;
            letter-spacing: -0.8pt;
            margin: 30pt 0 6pt 0;
        }
        .toc-rule {
            width: 60pt;
            height: 3pt;
            background: #2A7F7F;
            margin: 14pt 0 24pt 0;
            border: 0;
        }
        .toc-list { list-style: none; margin: 0; padding: 0; }
        .toc-list li {
            display: table;
            width: 100%;
            margin: 0;
            padding: 10pt 0;
            border-bottom: 1px dotted #E5E7EB;
        }
        .toc-list li > * { display: table-cell; vertical-align: middle; }
        .toc-num {
            width: 36pt;
        }
        .toc-num .badge {
            display: inline-block;
            width: 28pt; height: 28pt;
            border-radius: 50%;
            background: #2A7F7F;
            color: #FFFFFF;
            font-size: 10pt;
            font-weight: bold;
            text-align: center;
            line-height: 28pt;
        }
        .toc-label {
            font-size: 12pt;
            color: #1E3A5F;
            padding-left: 8pt;
        }
        .toc-page-num {
            width: 50pt;
            text-align: right;
            font-size: 12pt;
            color: #2A7F7F;
            font-weight: bold;
        }

        .toc-footer {
            margin-top: 30pt;
            background: #F4F4F2;
            border-radius: 14pt;
            padding: 14pt 18pt;
            display: table;
            width: 100%;
            border-collapse: collapse;
        }
        .toc-footer > div { display: table-cell; vertical-align: middle; }
        .toc-footer .icon-cell {
            width: 40pt;
        }
        .toc-footer .ic {
            display: inline-block;
            width: 30pt; height: 30pt;
            border-radius: 50%;
            background: #8FAF9F;
            color: #FFFFFF;
            text-align: center;
            line-height: 30pt;
            font-size: 14pt;
        }
        .toc-footer .msg {
            font-size: 10pt;
            color: #1E3A5F;
        }
        .toc-footer .msg strong {
            font-weight: bold;
        }

        /* ─── CONTENT PAGES ─── */
        .content-page .pad {
            padding-bottom: 0.85in; /* leave room for footer */
        }
        h2 {
            font-family: 'DejaVu Serif', Georgia, serif;
            font-size: 18pt;
            font-weight: bold;
            color: #1E3A5F;
            margin-top: 22pt;
            margin-bottom: 6pt;
            letter-spacing: -0.3pt;
            page-break-after: avoid;
        }
        h3 {
            font-size: 12pt;
            font-weight: bold;
            color: #1E3A5F;
            margin-top: 16pt;
            margin-bottom: 4pt;
            page-break-after: avoid;
        }
        p { margin: 0 0 10pt 0; color: #1F2937; line-height: 1.6; }
        ul, ol { margin: 0 0 10pt 0; padding-left: 20pt; }
        li { margin-bottom: 4pt; color: #1F2937; }

        .lead {
            font-size: 12pt;
            color: #1E3A5F;
            border-left: 3px solid #2A7F7F;
            padding: 4pt 0 4pt 14pt;
            margin: 0 0 16pt 0;
        }
        .callout {
            background: #F4F4F2;
            border-left: 4px solid #2A7F7F;
            padding: 12pt 14pt;
            margin: 14pt 0;
            font-size: 10pt;
            border-radius: 6pt;
            color: #1E3A5F;
        }
        .callout .label {
            font-weight: bold;
            color: #2A7F7F;
            text-transform: uppercase;
            font-size: 8pt;
            letter-spacing: 0.7pt;
            margin-bottom: 4pt;
        }
        .checkbox {
            display: inline-block;
            width: 11pt; height: 11pt;
            border: 1.5px solid #2A7F7F;
            border-radius: 2pt;
            margin-right: 7pt;
            vertical-align: middle;
        }
        .check-item { margin-bottom: 6pt; font-size: 10.5pt; color: #1F2937; }
        table.data { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
        table.data th, table.data td { text-align: left; padding: 6pt 8pt; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
        table.data th {
            background: #F4F4F2;
            font-weight: bold;
            color: #1E3A5F;
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
        }
        .small { font-size: 9pt; color: #4B5563; }

        .disclaimer {
            margin-top: 28pt;
            padding-top: 12pt;
            border-top: 1px solid #E5E7EB;
            font-size: 8pt;
            color: #4B5563;
            line-height: 1.5;
        }

        /* Navy contact strip — page footer on content pages. */
        .contact {
            background: #1E3A5F;
            color: #FFFFFF;
            padding: 10pt 0;
        }
        .contact table { width: 100%; border-collapse: collapse; margin: 0; }
        .contact td {
            padding: 6pt 14pt;
            font-size: 9pt;
            color: #FFFFFF;
            border-right: 1px solid rgba(255,255,255,0.10);
            text-align: center;
        }
        .contact td:last-child { border-right: 0; }
        .contact .ico {
            display: inline-block;
            background: #2A7F7F;
            color: #FFFFFF;
            font-weight: bold;
            border-radius: 50%;
            width: 14pt; height: 14pt;
            text-align: center; line-height: 14pt;
            font-size: 8pt;
            margin-right: 5pt;
        }

        .pagenum:after { content: counter(page); }
        .totalpages:after { content: counter(pages); }
    </style>
</head>
<body>

    {{-- ──────────────────────── COVER PAGE ──────────────────────── --}}
    <div class="page">
        <div class="pad">
            <div class="brand-strip">
                <div>
                    <div class="logo">CarePath</div>
                    <div class="tag">Long-Term Care Directory</div>
                </div>
                <div class="right">
                    <span class="pill"><span class="arrow">↓</span>FREE GUIDE</span>
                </div>
            </div>

            <div class="cover-body">
                <h1 class="cover-title">{{ $guide['title'] }}</h1>
                <hr class="cover-rule" />
                <p class="cover-subtitle">{{ $guide['subtitle'] }}</p>

                @if(! empty($guide['hero_image_url']))
                    <div class="hero-photo">
                        <img src="{{ $guide['hero_image_url'] }}" alt="{{ $guide['title'] }}">
                    </div>
                @elseif(! empty($guide['hero_panel']))
                    <div class="hero-block">
                        <div class="eye">{{ $guide['hero_panel']['eyebrow'] }}</div>
                        <div class="htitle">{{ $guide['hero_panel']['title'] }}</div>
                    </div>
                @endif
            </div>
        </div>

        <div class="cover-band">
            <table>
                <tr>
                    <td class="icon-cell">
                        <span class="icon-circle">♥</span>
                    </td>
                    <td class="summary">
                        Helping families navigate long-term care with clarity and confidence.
                    </td>
                    <td class="vp-list">
                        @foreach(($guide['value_props'] ?? ['Understand your options','Plan with confidence','Find local support']) as $vp)
                            <span class="vp"><span class="check">✓</span>{{ $vp }}</span>
                        @endforeach
                    </td>
                </tr>
            </table>
            <div class="cover-url">CAREPATH.IO</div>
        </div>
    </div>

    {{-- ──────────────────────── TABLE OF CONTENTS ──────────────────────── --}}
    @if(! empty($guide['toc']))
    <div class="page">
        <div class="pad">
            <div class="brand-strip">
                <div>
                    <div class="logo">CarePath</div>
                    <div class="tag">Long-Term Care Directory</div>
                </div>
                <div class="right">
                    <div class="tag" style="color:#4B5563;letter-spacing:1pt;">YOUR GUIDE TO</div>
                    <div style="font-family:'DejaVu Serif',Georgia,serif;font-size:12pt;font-weight:bold;color:#1E3A5F;margin-top:2pt;">
                        {{ strtoupper($guide['category']) }}
                    </div>
                </div>
            </div>

            <h1 class="toc-title">Table of<br/>Contents</h1>
            <hr class="toc-rule" />

            <ul class="toc-list">
                @foreach($guide['toc'] as $item)
                    <li>
                        <span class="toc-num">
                            <span class="badge">{{ str_pad((string) $item['n'], 2, '0', STR_PAD_LEFT) }}</span>
                        </span>
                        <span class="toc-label">{{ $item['label'] }}</span>
                        <span class="toc-page-num">{{ $item['page'] }}</span>
                    </li>
                @endforeach
            </ul>

            <div class="toc-footer">
                <div class="icon-cell"><span class="ic">♥</span></div>
                <div class="msg">
                    <strong>We're here to help</strong> every step of the way.
                </div>
            </div>
        </div>
    </div>
    @endif

    {{-- ──────────────────────── CONTENT (per-guide blade) ──────────────────────── --}}
    <div class="page content-page">
        <div class="pad">
            <div class="brand-strip" style="margin-bottom: 14pt; padding-bottom: 8pt; border-bottom: 2px solid #2A7F7F;">
                <div>
                    <div class="logo" style="font-size:13pt;">CarePath</div>
                </div>
                <div class="right">
                    <div class="tag" style="color:#4B5563;font-size:7pt;">{{ strtoupper($guide['category']) }}</div>
                </div>
            </div>

            @yield('content')

            <div class="disclaimer">
                This guide is general educational information from CarePath. It is not legal,
                medical, or financial advice. Rules vary by state and change over time. For
                decisions that affect your family, consult a licensed elder-law attorney,
                physician, or financial advisor in your state.
                <br><br>
                © {{ date('Y') }} CarePath. Source data from CMS Nursing Home Compare and the
                respective federal/state agencies.
            </div>
        </div>

        <div class="contact">
            <table>
                <tr>
                    <td><span class="ico">@</span> hello@carepath.io</td>
                    <td><span class="ico">☎</span> (800) 555-0179</td>
                    <td><span class="ico">⌂</span> carepath.io</td>
                </tr>
            </table>
        </div>
    </div>
</body>
</html>
