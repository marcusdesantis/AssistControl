package com.abisoft.tiempoya.admin;

import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyWindowInsets();
    }

    /**
     * Ajusta la WebView al área segura de la pantalla.
     *
     * Desde targetSdk 36 Android fuerza edge-to-edge y ya no respeta
     * windowOptOutEdgeToEdgeEnforcement, así que la WebView se dibuja debajo de
     * la barra de estado y de la barra de navegación.
     *
     * Esto NO puede resolverse con CSS: en Android env(safe-area-inset-*) solo
     * refleja el display cutout (el notch), no las barras del sistema — a
     * diferencia de iOS, donde WKWebView sí expone el área segura completa.
     * Por eso el ajuste se hace acá, que además es lo que pide Google Play
     * ("controlar las inserciones").
     */
    private void applyWindowInsets() {
        final View content = findViewById(android.R.id.content);

        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());

            // Con el teclado abierto manda su altura; si no, la barra de navegación.
            int bottom = Math.max(bars.bottom, ime.bottom);
            view.setPadding(bars.left, bars.top, bars.right, bottom);

            // Se devuelven sin consumir para no romper a otros listeners.
            return windowInsets;
        });
    }
}
