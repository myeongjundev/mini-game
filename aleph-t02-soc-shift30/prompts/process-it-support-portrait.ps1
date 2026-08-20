Add-Type -AssemblyName System.Drawing

$project = 'C:\gov\SKT-ALEPH\mini-game\aleph-t02-soc-shift30'
$inputPath = Join-Path $project 'prompts\art-source\it-support-portrait-rejected-checkerboard.png'
$sourcePath = Join-Path $project 'prompts\art-source\it-support-portrait-source.png'
$outputPath = Join-Path $project 'public\it-support-portrait-128.png'

$inputImage = [System.Drawing.Bitmap]::FromFile($inputPath)
$transparent = New-Object System.Drawing.Bitmap($inputImage.Width, $inputImage.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($transparent)
$graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$attributes = New-Object System.Drawing.Imaging.ImageAttributes
$attributes.SetColorKey([System.Drawing.Color]::FromArgb(232, 232, 232), [System.Drawing.Color]::FromArgb(255, 255, 255))
$rectangle = New-Object System.Drawing.Rectangle(0, 0, $inputImage.Width, $inputImage.Height)
$graphics.DrawImage($inputImage, $rectangle, 0, 0, $inputImage.Width, $inputImage.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
$graphics.Dispose()
$attributes.Dispose()
$inputImage.Dispose()
$transparent.Save($sourcePath, [System.Drawing.Imaging.ImageFormat]::Png)

$resized = New-Object System.Drawing.Bitmap(128, 128, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($resized)
$graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.DrawImage($transparent, 0, 0, 128, 128)
$graphics.Dispose()
$transparent.Dispose()

$palette = @(
    [System.Drawing.ColorTranslator]::FromHtml('#0A0C10'),
    [System.Drawing.ColorTranslator]::FromHtml('#12161D'),
    [System.Drawing.ColorTranslator]::FromHtml('#232B36'),
    [System.Drawing.ColorTranslator]::FromHtml('#F0A93B'),
    [System.Drawing.ColorTranslator]::FromHtml('#E2564D'),
    [System.Drawing.ColorTranslator]::FromHtml('#6FCF6B')
)

for ($y = 0; $y -lt 128; $y++) {
    for ($x = 0; $x -lt 128; $x++) {
        $pixel = $resized.GetPixel($x, $y)
        if ($pixel.A -lt 128) {
            $resized.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
            continue
        }
        $nearest = $palette[0]
        $nearestDistance = [double]::MaxValue
        foreach ($candidate in $palette) {
            $dr = $pixel.R - $candidate.R
            $dg = $pixel.G - $candidate.G
            $db = $pixel.B - $candidate.B
            $distance = ($dr * $dr) + ($dg * $dg) + ($db * $db)
            if ($distance -lt $nearestDistance) {
                $nearestDistance = $distance
                $nearest = $candidate
            }
        }
        $resized.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $nearest.R, $nearest.G, $nearest.B))
    }
}

$resized.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$resized.Dispose()
