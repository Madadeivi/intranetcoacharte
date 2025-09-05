#!/bin/bash

# Script para optimizar PDFs para web
# Uso: ./optimize-pdf.sh input.pdf [output.pdf]

if [ $# -eq 0 ]; then
    echo "Error: Debes proporcionar un archivo PDF de entrada"
    echo "Uso: $0 input.pdf [output.pdf]"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="${2:-${INPUT_FILE%.*}_optimized.pdf}"

# Verificar que el archivo existe
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: El archivo '$INPUT_FILE' no existe"
    exit 1
fi

echo "🔄 Optimizando PDF para web..."
echo "📁 Archivo de entrada: $INPUT_FILE"
echo "📁 Archivo de salida: $OUTPUT_FILE"

# Optimizar PDF con Ghostscript
gs -sDEVICE=pdfwrite \
   -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/ebook \
   -dNOPAUSE \
   -dQUIET \
   -dBATCH \
   -dColorImageResolution=150 \
   -dGrayImageResolution=150 \
   -dMonoImageResolution=150 \
   -sOutputFile="$OUTPUT_FILE" \
   "$INPUT_FILE"

if [ $? -eq 0 ]; then
    echo "✅ PDF optimizado exitosamente: $OUTPUT_FILE"
    
    # Mostrar información de tamaños
    INPUT_SIZE=$(stat -f%z "$INPUT_FILE" 2>/dev/null || stat -c%s "$INPUT_FILE" 2>/dev/null)
    OUTPUT_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null)
    
    if [ ! -z "$INPUT_SIZE" ] && [ ! -z "$OUTPUT_SIZE" ]; then
        INPUT_MB=$(echo "scale=2; $INPUT_SIZE / 1024 / 1024" | bc 2>/dev/null || python3 -c "print(f'{$INPUT_SIZE/1024/1024:.2f}')")
        OUTPUT_MB=$(echo "scale=2; $OUTPUT_SIZE / 1024 / 1024" | bc 2>/dev/null || python3 -c "print(f'{$OUTPUT_SIZE/1024/1024:.2f}')")
        
        echo "📊 Tamaño original: ${INPUT_MB} MB"
        echo "📊 Tamaño optimizado: ${OUTPUT_MB} MB"
        
        if [ ! -z "$INPUT_SIZE" ] && [ "$INPUT_SIZE" -gt 0 ]; then
            REDUCTION=$(echo "scale=1; (($INPUT_SIZE - $OUTPUT_SIZE) * 100) / $INPUT_SIZE" | bc 2>/dev/null || python3 -c "print(f'{(($INPUT_SIZE - $OUTPUT_SIZE) * 100) / $INPUT_SIZE:.1f}')")
            echo "🎯 Reducción: ${REDUCTION}%"
        fi
    fi
else
    echo "❌ Error al optimizar el PDF"
    exit 1
fi

echo ""
echo "💡 Para generar thumbnail:"
echo "convert \"$OUTPUT_FILE[0]\" -quality 85 -resize 300x400 \"${OUTPUT_FILE%.*}_thumbnail.jpg\""
