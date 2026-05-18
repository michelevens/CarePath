<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $guide['title'] }} — CarePath</title>
    <style>
        /* Canonical CarePath palette — matches CarePathGuideTemplate.tsx.
           DomPDF can't load Google Fonts at runtime, so we fall back to
           DejaVu Serif (bundled with DomPDF, closest stylistic match to
           Playfair) for headings, and the default sans for body. */
        @page { margin: 0.65in 0.6in 0.85in 0.6in; }
        body {
            font-family: 'Helvetica', sans-serif;
            color: #1E3A5F;
            font-size: 11pt;
            line-height: 1.55;
            margin: 0;
            background: #FFFFFF;
        }

        .brandbar {
            border-bottom: 3px solid #2A7F7F;
            padding-bottom: 8pt;
            margin-bottom: 18pt;
        }
        .brandbar .logo {
            font-family: 'DejaVu Serif', Georgia, serif;
            font-size: 16pt;
            font-weight: bold;
            letter-spacing: -0.3pt;
            color: #1E3A5F;
        }
        .brandbar .tagline {
            font-size: 8pt;
            color: #2A7F7F;
            text-transform: uppercase;
            letter-spacing: 1.2pt;
            margin-top: 2pt;
        }

        .cover { margin-top: 30pt; }
        .cover-category {
            display: inline-block;
            background: #F4F4F2;
            color: #2A7F7F;
            padding: 4pt 10pt;
            border-radius: 12pt;
            font-size: 8pt;
            font-weight: bold;
            letter-spacing: 0.7pt;
            text-transform: uppercase;
            margin-bottom: 14pt;
        }
        .cover h1 {
            font-family: 'DejaVu Serif', Georgia, serif;
            font-size: 28pt;
            font-weight: bold;
            color: #1E3A5F;
            line-height: 1.12;
            margin: 0 0 12pt 0;
            letter-spacing: -0.5pt;
        }
        .cover .subtitle {
            font-size: 13pt;
            color: #4B5563;
            line-height: 1.4;
            margin-bottom: 26pt;
        }

        /* Hero panel mirroring the navy/teal gradient block in the web template. */
        .hero-panel {
            background: #2A7F7F;
            color: #FFFFFF;
            border-radius: 10pt;
            padding: 16pt 18pt;
            margin: 0 0 22pt 0;
        }
        .hero-panel .eye {
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 0.8pt;
            color: #8FAF9F;
            font-weight: bold;
        }
        .hero-panel .title {
            font-family: 'DejaVu Serif', Georgia, serif;
            font-size: 16pt;
            font-weight: bold;
            margin-top: 4pt;
            line-height: 1.2;
        }

        .cover .meta {
            border-top: 1px solid #E5E7EB;
            border-bottom: 1px solid #E5E7EB;
            padding: 9pt 0;
            margin-top: 22pt;
            font-size: 9pt;
            color: #4B5563;
        }
        .cover .meta span { display: inline-block; margin-right: 22pt; }
        .cover .meta strong { color: #1E3A5F; }
        .cover .byline {
            margin-top: 9pt;
            font-size: 9pt;
            color: #4B5563;
        }
        .cover .byline strong { color: #1E3A5F; font-weight: 600; }

        h2 {
            font-family: 'DejaVu Serif', Georgia, serif;
            font-size: 15pt;
            font-weight: bold;
            color: #1E3A5F;
            margin-top: 22pt;
            margin-bottom: 8pt;
            letter-spacing: -0.2pt;
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
        p { margin: 0 0 9pt 0; color: #1F2937; }
        ul, ol { margin: 0 0 10pt 0; padding-left: 18pt; }
        li { margin-bottom: 4pt; color: #1F2937; }

        .lead {
            font-size: 12pt;
            color: #1E3A5F;
            border-left: 3px solid #2A7F7F;
            padding: 4pt 0 4pt 12pt;
            margin: 0 0 14pt 0;
            background: transparent;
        }
        .callout {
            background: #F4F4F2;
            border-left: 4px solid #2A7F7F;
            padding: 11pt 14pt;
            margin: 12pt 0;
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
            width: 11pt;
            height: 11pt;
            border: 1.5px solid #2A7F7F;
            border-radius: 2pt;
            margin-right: 7pt;
            vertical-align: middle;
        }
        .check-item { margin-bottom: 6pt; font-size: 10.5pt; color: #1F2937; }
        table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
        th, td { text-align: left; padding: 6pt 8pt; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
        th {
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

        /* Navy contact strip — mirrors the web template footer block. */
        .contact {
            margin-top: 14pt;
            background: #1E3A5F;
            color: #FFFFFF;
            border-radius: 8pt;
            padding: 0;
        }
        .contact table { width: 100%; border-collapse: collapse; margin: 0; }
        .contact td {
            padding: 9pt 14pt;
            font-size: 9pt;
            color: #FFFFFF;
            border-right: 1px solid rgba(255,255,255,0.10);
            border-bottom: 0;
            text-align: center;
            vertical-align: middle;
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

        .footer {
            position: fixed;
            bottom: -55pt;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8pt;
            color: #4B5563;
        }
        .footer strong { color: #1E3A5F; }
        .pagenum:after { content: counter(page); }
        .totalpages:after { content: counter(pages); }
    </style>
</head>
<body>
    <div class="brandbar">
        <div class="logo">CarePath</div>
        <div class="tagline">Long-term care, modernized</div>
    </div>

    <div class="cover">
        <span class="cover-category">{{ strtoupper(str_replace('_', ' ', $guide['category'])) }}</span>
        <h1>{{ $guide['title'] }}</h1>
        <div class="subtitle">{{ $guide['subtitle'] }}</div>

        @if(! empty($guide['hero_panel']))
            <div class="hero-panel">
                <div class="eye">{{ $guide['hero_panel']['eyebrow'] ?? 'Care Planning' }}</div>
                <div class="title">{{ $guide['hero_panel']['title'] ?? 'Local Support Starts Here' }}</div>
            </div>
        @endif

        <div class="meta">
            <span><strong>For:</strong> {{ $guide['audience'] }}</span>
            <span><strong>Pages:</strong> {{ $guide['page_count'] }}</span>
            <span><strong>Updated:</strong> {{ $today }}</span>
        </div>
        @if(! empty($guide['author']))
            <div class="byline">
                Written by <strong>{{ $guide['author']['name'] }}</strong>
                @if(! empty($guide['reviewer']))
                    &nbsp;·&nbsp; Reviewed by <strong>{{ $guide['reviewer']['name'] }}</strong>
                @endif
            </div>
        @endif
    </div>

    @yield('content')

    <div class="disclaimer">
        This guide is general educational information from CarePath. It is not legal,
        medical, or financial advice. Rules vary by state and change over time. For
        decisions that affect your family, consult a licensed elder-law attorney,
        physician, or financial advisor in your state.
        <br><br>
        © {{ date('Y') }} CarePath. Source data from CMS Nursing Home Compare and the
        respective federal/state agencies. Distribute freely, do not modify.
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

    <div class="footer">
        <strong>CarePath</strong> &nbsp;·&nbsp; carepath.io &nbsp;·&nbsp; No lead-selling, ever &nbsp;·&nbsp;
        Page <span class="pagenum"></span> of <span class="totalpages"></span>
    </div>
</body>
</html>
