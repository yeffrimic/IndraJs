# resize-sprites.ps1 — estandariza TODOS los PNG de assets/ a medidas fijas,
# sin importar el tamaño con que los generes. Re-ejecutable (idempotente).
#
#   Uso:  powershell -ExecutionPolicy Bypass -File resize-sprites.ps1
#
# Reglas de tamaño (primer match gana). 'fit' = mantiene proporción y centra en
# lienzo transparente del tamaño objetivo. 'stretch' = estira a exacto (fondos).
Add-Type -AssemblyName System.Drawing

$reglas = @(
  @{ match = '\\fondos\\';      w = 1600; h = 1200; modo = 'stretch' },
  @{ match = 'cuarto_bg\.png$'; w = 1600; h = 1200; modo = 'stretch' },
  @{ match = '\\grid\\';        w = 512;  h = 512;  modo = 'fit' },
  @{ match = '\\ui\\';          w = 256;  h = 256;  modo = 'fit' },
  @{ match = '\\muebles\\';     w = 512;  h = 512;  modo = 'fit' },
  @{ match = 'comp_.*\.png$';   w = 512;  h = 512;  modo = 'fit' },
  @{ match = 'snake_.*\.png$';  w = 512;  h = 512;  modo = 'fit' },
  @{ match = '(workbench|tienda|escritorio|alfombra|estante)\.png$'; w = 512; h = 512; modo = 'fit' }
)
$saltar = @('personaje.png')          # spritesheet de caminata: NO tocar (rompería los frames)
$porDefecto = @{ w = 512; h = 512; modo = 'fit' }

function Resize-Png($path, $tw, $th, $modo) {
  # cargar desde memoria para no dejar el archivo bloqueado al sobrescribir
  $bytes = [System.IO.File]::ReadAllBytes($path)
  $ms = New-Object System.IO.MemoryStream(,$bytes)
  $src = [System.Drawing.Image]::FromStream($ms)
  $ow = $src.Width; $oh = $src.Height

  $dst = New-Object System.Drawing.Bitmap($tw, $th, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($dst)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  if ($modo -eq 'stretch') {
    $g.DrawImage($src, 0, 0, $tw, $th)
  } else {
    $scale = [Math]::Min($tw / $ow, $th / $oh)
    $nw = [int][Math]::Round($ow * $scale); $nh = [int][Math]::Round($oh * $scale)
    $x = [int](($tw - $nw) / 2); $y = [int](($th - $nh) / 2)
    $g.DrawImage($src, $x, $y, $nw, $nh)
  }

  $g.Dispose(); $src.Dispose(); $ms.Dispose()
  $dst.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $dst.Dispose()
  return "{0}x{1} -> {2}x{3}" -f $ow, $oh, $tw, $th
}

$root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$assets = Join-Path $root 'assets'
if (-not (Test-Path $assets)) { Write-Host "No existe la carpeta assets/"; exit 1 }

Write-Host "Redimensionando PNG en $assets ..." -ForegroundColor Cyan
Get-ChildItem -Path $assets -Recurse -Filter *.png | ForEach-Object {
  if ($saltar -contains $_.Name) { Write-Host ("  salto   {0} (spritesheet)" -f $_.Name) -ForegroundColor DarkGray; return }
  $rel = $_.FullName.Substring($assets.Length)
  $regla = $porDefecto
  foreach ($r in $reglas) { if ($rel -match $r.match) { $regla = $r; break } }
  try {
    $res = Resize-Png $_.FullName $regla.w $regla.h $regla.modo
    Write-Host ("  ok      {0,-22} {1}" -f $_.Name, $res) -ForegroundColor Green
  } catch {
    Write-Host ("  ERROR   {0}: {1}" -f $_.Name, $_.Exception.Message) -ForegroundColor Red
  }
}
Write-Host "Listo." -ForegroundColor Cyan
